import fs from 'fs'
import { join } from 'path'
import { cwd } from 'process'

/**
 * 读取 TypeScript 文件内容，并将其转换为默认导出的字符串。
 *
 * @param {string} inputFilePath 输入 TypeScript 文件路径。
 * @param {string} outputFilePath 输出 TypeScript 文件路径。
 */
function convertTsFileToStringExport(
  inputFilePath: string,
  outputFilePath: string
) {
  try {
    // 读取 TypeScript 文件内容
    const fileContent = fs.readFileSync(inputFilePath, 'utf8')

    // 对特殊字符进行转义，确保字符串字面量正确
    const escapedContent = fileContent
      .replace(/\\/g, '\\\\') // 转义反斜杠
      .replace(/`/g, '\\`') // 转义反引号
      .replace(/\$/g, '\\$') // 转义美元符号

    // 构建导出的字符串
    const exportedString = `export default \`${escapedContent}\`;`

    // 写入新的 TypeScript 文件
    fs.writeFileSync(outputFilePath, exportedString, 'utf8')

    console.log(`成功将 ${inputFilePath} 转换为 ${outputFilePath}`)
  } catch (error) {
    console.error(`转换文件时出错: ${error.message}`)
  }
}

function main() {
  convertTsFileToStringExport(
    join(cwd(), 'src', 'renderer', 'components', 'ui', 'chart.tsx'),
    './chart.ts'
  )
}

main()
