import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { isNodeSelectorSheetVisibleAtom } from '@/stores/workflow'
import { useAtom } from 'jotai'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { nodeTree, WorkflowNode } from './nodes/node-tree'

function NodeItem({
  node,
  onClick
}: {
  node: WorkflowNode
  onClick: () => void
}) {
  return (
    <li
      className="hover:bg-sidebar-accent flex cursor-pointer items-center justify-between gap-4 border-b p-4 select-none"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <node.icon size={36} strokeWidth={1} className="shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-sm">{node.title}</span>
          <span className="text-muted-foreground text-xs">
            {node.description}
          </span>
        </div>
      </div>
      {node.children ? (
        <ChevronRightIcon size={24} strokeWidth={1} className="shrink-0" />
      ) : (
        <ArrowRightIcon size={24} strokeWidth={1} className="shrink-0" />
      )}
    </li>
  )
}

export function NodeSelectorSheet() {
  const [open, setOpen] = useAtom(isNodeSelectorSheetVisibleAtom)
  const [navigationStack, setNavigationStack] = useState<WorkflowNode[][]>([
    nodeTree
  ])
  const [currentTitle, setCurrentTitle] = useState<string>('What happens next?')

  const currentNodes = navigationStack[navigationStack.length - 1]
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)

  useEffect(() => {
    // Clear search when navigating between layers to avoid stale filters
    setSearchTerm('')
    setDebouncedTerm('')
  }, [navigationStack])

  useEffect(() => {
    // Clear search when sheet is closed/opened
    if (!open) setSearchTerm('')
  }, [open])

  // Lightweight debounce for searchTerm -> debouncedTerm
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedTerm(searchTerm), 180)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Keep debounced term cleared when sheet closes
  useEffect(() => {
    if (!open) setDebouncedTerm('')
  }, [open])

  const filteredNodes = currentNodes.filter((n) => {
    if (!debouncedTerm) return true
    const q = debouncedTerm.toLowerCase()
    return (
      n.title.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q)
    )
  })

  // When searching, we want to match across the whole tree, not only the current layer.
  const findMatchesInTree = (query: string) => {
    const q = query.toLowerCase()
    const matches: { node: WorkflowNode; path: WorkflowNode[] }[] = []

    const dfs = (nodes: WorkflowNode[], path: WorkflowNode[]) => {
      for (const n of nodes) {
        const newPath = [...path, n]
        if (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
        ) {
          matches.push({ node: n, path: newPath })
        }
        if (n.children) dfs(n.children, newPath)
      }
    }

    dfs(nodeTree, [])
    return matches
  }

  const treeMatches = debouncedTerm ? findMatchesInTree(debouncedTerm) : []

  // Remove ancestor matches when a deeper descendant also matches.
  // e.g. if "Data Source" and its child "Web Search" both match "web",
  // prefer showing only "Web Search" (the deeper match).
  const filteredMatches = treeMatches.filter((m) => {
    return !treeMatches.some((other) => {
      if (other === m) return false
      // if m.node appears in other's path, then other is a descendant of m
      return other.path.includes(m.node)
    })
  })

  const handleNodeClick = (node: WorkflowNode) => {
    if (node.children) {
      setNavigationStack([...navigationStack, node.children])
      setCurrentTitle(node.title)
    }
  }

  const handleMatchClick = (match: {
    node: WorkflowNode
    path: WorkflowNode[]
  }) => {
    const { node, path } = match

    // Build navigation stack: start with root nodeTree, then push each ancestor's children
    const newStack: WorkflowNode[][] = [nodeTree]
    for (const p of path.slice(0, -1)) {
      if (p.children) newStack.push(p.children)
    }

    // If the matched node itself has children, navigate into them
    if (node.children) {
      newStack.push(node.children)
      setCurrentTitle(node.title)
    } else if (path.length > 1) {
      // Otherwise, show its parent layer
      const parent = path[path.length - 2]
      setCurrentTitle(parent.title)
    } else {
      setCurrentTitle('What happens next?')
    }

    setNavigationStack(newStack)
    // Clear search after navigating to give predictable UI
    setSearchTerm('')
    setDebouncedTerm('')
  }

  const handleBack = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(navigationStack.slice(0, -1))
      setCurrentTitle(
        navigationStack.length === 2
          ? 'What happens next?'
          : navigationStack[navigationStack.length - 2][0].title
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetContent className="mt-12">
        <SheetHeader className="flex-row items-center gap-4">
          {navigationStack.length > 1 && (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="hover:bg-sidebar-accent rounded-md p-1"
            >
              <ChevronLeftIcon size={20} strokeWidth={1} />
            </Button>
          )}
          <SheetTitle>{currentTitle}</SheetTitle>
        </SheetHeader>
        {/* Search */}
        <div className="px-4">
          <Label htmlFor="node-search" className="sr-only">
            Search nodes
          </Label>
          <Input
            id="node-search"
            type="search"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ul>
          {debouncedTerm ? (
            filteredMatches.length > 0 ? (
              filteredMatches.map((m, idx) => (
                <NodeItem
                  node={m.node}
                  key={idx}
                  onClick={() => handleMatchClick(m)}
                />
              ))
            ) : (
              <li className="text-muted-foreground p-4 text-sm">
                No nodes found
              </li>
            )
          ) : filteredNodes.length > 0 ? (
            filteredNodes.map((node, idx) => (
              <NodeItem
                node={node}
                key={idx}
                onClick={() => handleNodeClick(node)}
              />
            ))
          ) : (
            <li className="text-muted-foreground p-4 text-sm">
              No nodes found
            </li>
          )}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
