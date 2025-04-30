export const exampleCode = `import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Menu,
  Pause,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAIPopup, setShowAIPopup] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    setIsLoaded(true)

    // Show AI popup after 3 seconds
    const popupTimer = setTimeout(() => {
      setShowAIPopup(true)
    }, 3000)

    return () => clearTimeout(popupTimer)
  }, [])

  useEffect(() => {
    if (showAIPopup) {
      const text =
        "LLooks like you don't have that many meetings today. Shall I play some Hans Zimmer essentials to help you get into your Flow State?"
      let i = 0
      const typingInterval = setInterval(() => {
        if (i < text.length) {
          setTypedText((prev) => prev + text.charAt(i))
          i++
        } else {
          clearInterval(typingInterval)
        }
      }, 50)

      return () => clearInterval(typingInterval)
    }
  }, [showAIPopup])

  const [currentView, setCurrentView] = useState('week')
  const [currentMonth, setCurrentMonth] = useState('March 2025')
  const [currentDate, setCurrentDate] = useState('March 5')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const handleEventClick = (event) => {
    setSelectedEvent(event)
  }

  // Updated sample calendar events with all events before 4 PM
  const events = [
    {
      id: 1,
      title: 'Team Meeting',
      startTime: '09:00',
      endTime: '10:00',
      color: 'bg-blue-500',
      day: 1,
      description: 'Weekly team sync-up',
      location: 'Conference Room A',
      attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
      organizer: 'Alice Brown'
    },
    {
      id: 2,
      title: 'Lunch with Sarah',
      startTime: '12:30',
      endTime: '13:30',
      color: 'bg-green-500',
      day: 1,
      description: 'Discuss project timeline',
      location: 'Cafe Nero',
      attendees: ['Sarah Lee'],
      organizer: 'You'
    },
    {
      id: 3,
      title: 'Project Review',
      startTime: '14:00',
      endTime: '15:30',
      color: 'bg-purple-500',
      day: 3,
      description: 'Q2 project progress review',
      location: 'Meeting Room 3',
      attendees: ['Team Alpha', 'Stakeholders'],
      organizer: 'Project Manager'
    },
    {
      id: 4,
      title: 'Client Call',
      startTime: '10:00',
      endTime: '11:00',
      color: 'bg-yellow-500',
      day: 2,
      description: 'Quarterly review with major client',
      location: 'Zoom Meeting',
      attendees: ['Client Team', 'Sales Team'],
      organizer: 'Account Manager'
    },
    {
      id: 5,
      title: 'Team Brainstorm',
      startTime: '13:00',
      endTime: '14:30',
      color: 'bg-indigo-500',
      day: 4,
      description: 'Ideation session for new product features',
      location: 'Creative Space',
      attendees: ['Product Team', 'Design Team'],
      organizer: 'Product Owner'
    },
    {
      id: 6,
      title: 'Product Demo',
      startTime: '11:00',
      endTime: '12:00',
      color: 'bg-pink-500',
      day: 5,
      description: 'Showcase new features to stakeholders',
      location: 'Demo Room',
      attendees: ['Stakeholders', 'Dev Team'],
      organizer: 'Tech Lead'
    },
    {
      id: 7,
      title: 'Marketing Meeting',
      startTime: '13:00',
      endTime: '14:00',
      color: 'bg-teal-500',
      day: 6,
      description: 'Discuss Q3 marketing strategy',
      location: 'Marketing Office',
      attendees: ['Marketing Team'],
      organizer: 'Marketing Director'
    },
    {
      id: 8,
      title: 'Code Review',
      startTime: '15:00',
      endTime: '16:00',
      color: 'bg-cyan-500',
      day: 7,
      description: 'Review pull requests for new feature',
      location: 'Dev Area',
      attendees: ['Dev Team'],
      organizer: 'Senior Developer'
    },
    {
      id: 9,
      title: 'Morning Standup',
      startTime: '08:30',
      endTime: '09:30', // Changed from "09:00" to "09:30"
      color: 'bg-blue-400',
      day: 2,
      description: 'Daily team standup',
      location: 'Slack Huddle',
      attendees: ['Development Team'],
      organizer: 'Scrum Master'
    },
    {
      id: 10,
      title: 'Design Review',
      startTime: '14:30',
      endTime: '15:45',
      color: 'bg-purple-400',
      day: 5,
      description: 'Review new UI designs',
      location: 'Design Lab',
      attendees: ['UX Team', 'Product Manager'],
      organizer: 'Lead Designer'
    },
    {
      id: 11,
      title: 'Investor Meeting',
      startTime: '10:30',
      endTime: '12:00',
      color: 'bg-red-400',
      day: 7,
      description: 'Quarterly investor update',
      location: 'Board Room',
      attendees: ['Executive Team', 'Investors'],
      organizer: 'CEO'
    },
    {
      id: 12,
      title: 'Team Training',
      startTime: '09:30',
      endTime: '11:30',
      color: 'bg-green-400',
      day: 4,
      description: 'New tool onboarding session',
      location: 'Training Room',
      attendees: ['All Departments'],
      organizer: 'HR'
    },
    {
      id: 13,
      title: 'Budget Review',
      startTime: '13:30',
      endTime: '15:00',
      color: 'bg-yellow-400',
      day: 3,
      description: 'Quarterly budget analysis',
      location: 'Finance Office',
      attendees: ['Finance Team', 'Department Heads'],
      organizer: 'CFO'
    },
    {
      id: 14,
      title: 'Client Presentation',
      startTime: '11:00',
      endTime: '12:30',
      color: 'bg-orange-400',
      day: 6,
      description: 'Present new project proposal',
      location: 'Client Office',
      attendees: ['Sales Team', 'Client Representatives'],
      organizer: 'Account Executive'
    },
    {
      id: 15,
      title: 'Product Planning',
      startTime: '14:00',
      endTime: '15:30',
      color: 'bg-pink-400',
      day: 1,
      description: 'Roadmap discussion for Q3',
      location: 'Strategy Room',
      attendees: ['Product Team', 'Engineering Leads'],
      organizer: 'Product Manager'
    }
  ]

  // Sample calendar days for the week view
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const weekDates = [3, 4, 5, 6, 7, 8, 9]
  const timeSlots = Array.from({ length: 9 }, (_, i) => i + 8) // 8 AM to 4 PM

  // Helper function to calculate event position and height
  const calculateEventStyle = (startTime, endTime) => {
    const start =
      Number.parseInt(startTime.split(':')[0]) +
      Number.parseInt(startTime.split(':')[1]) / 60
    const end =
      Number.parseInt(endTime.split(':')[0]) +
      Number.parseInt(endTime.split(':')[1]) / 60
    const top = (start - 8) * 80 // 80px per hour
    const height = (end - start) * 80
    return { top: \`\${top}px\`, height: \`\${height}px\` }
  }

  // Sample calendar for mini calendar
  const daysInMonth = 31
  const firstDayOffset = 5 // Friday is the first day of the month in this example
  const miniCalendarDays = Array.from(
    { length: daysInMonth + firstDayOffset },
    (_, i) => (i < firstDayOffset ? null : i - firstDayOffset + 1)
  )

  // Sample my calendars
  const myCalendars = [
    { name: 'My Calendar', color: 'bg-blue-500' },
    { name: 'Work', color: 'bg-green-500' },
    { name: 'Personal', color: 'bg-purple-500' },
    { name: 'Family', color: 'bg-orange-500' }
  ]

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    // Here you would typically also control the actual audio playback
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop"
        alt="Beautiful mountain landscape"
        className="object-cover h-dvh"
      />

      {/* Navigation */}
      <header
        className={\`absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-8 py-6  \${isLoaded ? 'animate-fade-in' : ''}\`}
        style={{ animationDelay: '0.2s' }}
      >
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-white" />
          <span className="text-2xl font-semibold text-white drop-shadow-lg">
            Calendar
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              placeholder="Search"
              className="rounded-full border border-white/20 bg-white/10 py-2 pr-4 pl-10 text-white backdrop-blur-sm placeholder:text-white/70 focus:ring-2 focus:ring-white/30 focus:outline-none"
            />
          </div>
          <Settings className="h-6 w-6 text-white drop-shadow-md" />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white shadow-md">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="absolute top-20 left-0 flex w-full">
        {/* Sidebar */}
        <div
          className={\`w-64 rounded-tr-3xl border-r border-white/20 bg-white/10 p-4  shadow-xl backdrop-blur-lg \${isLoaded ? 'animate-fade-in' : ''} flex flex-col justify-between h-[calc(100dvh-80px)]\`}
          style={{ animationDelay: '0.4s' }}
        >
          <div>
            <button className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white">
              <Plus className="h-5 w-5" />
              <span>Create</span>
            </button>

            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-white">{currentMonth}</h3>
                <div className="flex gap-1">
                  <button className="rounded-full p-1 hover:bg-white/20">
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button className="rounded-full p-1 hover:bg-white/20">
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className="py-1 text-xs font-medium text-white/70"
                  >
                    {day}
                  </div>
                ))}

                {miniCalendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={\`flex h-7 w-7 items-center justify-center rounded-full text-xs \${
                      day === 5
                        ? 'bg-blue-500 text-white'
                        : 'text-white hover:bg-white/20'
                    } \${!day ? 'invisible' : ''}\`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* My Calendars */}
            <div>
              <h3 className="mb-3 font-medium text-white">My calendars</h3>
              <div className="space-y-2">
                {myCalendars.map((cal, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={\`h-3 w-3 rounded-sm \${cal.color}\`}></div>
                    <span className="text-sm text-white">{cal.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New position for the big plus button */}
          <button className="mt-6 flex h-14 w-14 items-center justify-center gap-2 self-start rounded-full bg-blue-500 p-4 text-white">
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Calendar View */}
        <div
          className={\`flex flex-1 flex-col  \${isLoaded ? 'animate-fade-in' : ''}\`}
          style={{ animationDelay: '0.6s' }}
        >
          {/* Calendar Controls */}
          <div className="flex items-center justify-between border-b border-white/20 p-4">
            <div className="flex items-center gap-4">
              <button className="rounded-md bg-blue-500 px-4 py-2 text-white">
                Today
              </button>
              <div className="flex">
                <button className="rounded-l-md p-2 text-white hover:bg-white/10">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="rounded-r-md p-2 text-white hover:bg-white/10">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {currentDate}
              </h2>
            </div>

            <div className="flex items-center gap-2 rounded-md p-1">
              <button
                onClick={() => setCurrentView('day')}
                className={\`rounded px-3 py-1 \${currentView === 'day' ? 'bg-white/20' : ''} text-sm text-white\`}
              >
                Day
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={\`rounded px-3 py-1 \${currentView === 'week' ? 'bg-white/20' : ''} text-sm text-white\`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView('month')}
                className={\`rounded px-3 py-1 \${currentView === 'month' ? 'bg-white/20' : ''} text-sm text-white\`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Week View */}
          <div className="flex-1 overflow-auto p-4">
            <div className="h-[100dvh-129px] rounded-xl border border-white/20 bg-white/20 shadow-xl backdrop-blur-lg">
              {/* Week Header */}
              <div className="grid grid-cols-8 border-b border-white/20">
                <div className="p-2 text-center text-xs text-white/50"></div>
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className="border-l border-white/20 p-2 text-center"
                  >
                    <div className="text-xs font-medium text-white/70">
                      {day}
                    </div>
                    <div
                      className={\`mt-1 text-lg font-medium text-white \${weekDates[i] === 5 ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-500' : ''}\`}
                    >
                      {weekDates[i]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-8">
                {/* Time Labels */}
                <div className="text-white/70">
                  {timeSlots.map((time, i) => (
                    <div
                      key={i}
                      className="h-20 border-b border-white/10 pr-2 text-right text-xs"
                    >
                      {time > 12 ? \`\${time - 12} PM\` : \`\${time} AM\`}
                    </div>
                  ))}
                </div>

                {/* Days Columns */}
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="relative border-l border-white/20"
                  >
                    {timeSlots.map((_, timeIndex) => (
                      <div
                        key={timeIndex}
                        className="h-20 border-b border-white/10"
                      ></div>
                    ))}

                    {/* Events */}
                    {events
                      .filter((event) => event.day === dayIndex + 1)
                      .map((event, i) => {
                        const eventStyle = calculateEventStyle(
                          event.startTime,
                          event.endTime
                        )
                        return (
                          <div
                            key={i}
                            className={\`absolute \${event.color} cursor-pointer rounded-md p-2 text-xs text-white shadow-md transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg\`}
                            style={{
                              ...eventStyle,
                              left: '4px',
                              right: '4px'
                            }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="mt-1 text-[10px] opacity-80">{\`\${event.startTime} - \${event.endTime}\`}</div>
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Popup */}
        {showAIPopup && (
          <div className="fixed right-8 bottom-8 z-20">
            <div className="relative w-[450px] rounded-2xl border border-blue-300/30 bg-gradient-to-br from-blue-400/30 via-blue-500/30 to-blue-600/30 p-6 text-white shadow-xl backdrop-blur-lg">
              <button
                onClick={() => setShowAIPopup(false)}
                className="absolute top-2 right-2 text-white/70 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-300" />
                </div>
                <div className="min-h-[80px]">
                  <p className="text-base font-light">{typedText}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={togglePlay}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-medium transition-colors hover:bg-white/20"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowAIPopup(false)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-medium transition-colors hover:bg-white/20"
                >
                  No
                </button>
              </div>
              {isPlaying && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause Hans Zimmer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedEvent && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div
              className={\`\${selectedEvent.color} mx-4 w-full max-w-md rounded-lg p-6 shadow-xl\`}
            >
              <h3 className="mb-4 text-2xl font-bold text-white">
                {selectedEvent.title}
              </h3>
              <div className="space-y-3 text-white">
                <p className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  {\`\${selectedEvent.startTime} - \${selectedEvent.endTime}\`}
                </p>
                <p className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {selectedEvent.location}
                </p>
                <p className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {\`\${weekDays[selectedEvent.day - 1]}, \${weekDates[selectedEvent.day - 1]} \${currentMonth}\`}
                </p>
                <p className="flex items-start">
                  <Users className="mt-1 mr-2 h-5 w-5" />
                  <span>
                    <strong>Attendees:</strong>
                    <br />
                    {selectedEvent.attendees.join(', ') || 'No attendees'}
                  </span>
                </p>
                <p>
                  <strong>Organizer:</strong> {selectedEvent.organizer}
                </p>
                <p>
                  <strong>Description:</strong> {selectedEvent.description}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="rounded bg-white px-4 py-2 text-gray-800 transition-colors hover:bg-gray-100"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button - Removed */}
      </main>
    </div>
  )
}
`
