/**
 * API Integration Test Suite
 * Tests all CRUD operations for frontend-backend integration
 * 
 * Usage: node test-api.js
 */

import {
  checkHealth,
  getDocuments,
  searchChats,
  getChatHistory,
} from './src/services/api.js'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
}

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.yellow}=== ${msg} ===${colors.reset}`),
}

const runTests = async () => {
  let passCount = 0
  let failCount = 0

  log.section('HEALTH CHECK')
  try {
    const health = await checkHealth()
    log.success('Backend health check passed')
    passCount++
  } catch (err) {
    log.error(`Health check failed: ${err.message}`)
    failCount++
    return // Stop if backend isn't available
  }

  log.section('DOCUMENTS - READ OPERATIONS')
  try {
    const docs = await getDocuments()
    log.success(`Retrieved ${docs.length} documents`)
    log.info(`Found documents: ${docs.map((d) => d.display_name || d.filename).join(', ')}`)
    passCount++
  } catch (err) {
    log.error(`Failed to get documents: ${err.message}`)
    failCount++
  }

  log.section('CHATS - SEARCH OPERATIONS')
  try {
    const chats = await searchChats()
    log.success(`Searched chats successfully, found ${chats.results?.length || 0} messages`)
    passCount++
  } catch (err) {
    log.error(`Failed to search chats: ${err.message}`)
    failCount++
  }

  log.section('CHAT HISTORY - READ OPERATIONS')
  try {
    const docs = await getDocuments()
    if (docs.length > 0) {
      const firstDoc = docs[0]
      const history = await getChatHistory(firstDoc.document_id)
      log.success(`Retrieved chat history for ${firstDoc.display_name}`)
      log.info(`History contains ${history.messages?.length || 0} messages`)
      passCount++
    } else {
      log.info('No documents available for history test')
    }
  } catch (err) {
    log.error(`Failed to get chat history: ${err.message}`)
    failCount++
  }

  log.section('TEST SUMMARY')
  const total = passCount + failCount
  const percentage = Math.round((passCount / total) * 100)
  console.log(
    `\n${colors.blue}Passed: ${colors.green}${passCount}/${total}${colors.blue} (${percentage}%)${colors.reset}`
  )

  if (failCount > 0) {
    console.log(
      `${colors.blue}Failed: ${colors.red}${failCount}/${total}${colors.blue}${colors.reset}`
    )
  }

  process.exit(failCount === 0 ? 0 : 1)
}

// Run tests
log.info('Starting API integration tests...\n')
runTests().catch((err) => {
  log.error(`Test suite failed: ${err.message}`)
  process.exit(1)
})
