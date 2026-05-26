/**
 * Test Script: Multiple File Upload
 * Tests the backend ingest endpoint with multiple files
 * 
 * Usage:
 * node test-multiple-upload.js
 * 
 * This script tests:
 * 1. Single file upload
 * 2. Multiple files upload (2 files)
 * 3. Multiple files upload (3 files)
 * 4. Error handling for invalid files
 */

const API_BASE_URL = 'http://127.0.0.1:8000'
const fs = require('fs')
const path = require('path')

// Create test files
function createTestFiles() {
  const testDir = path.join(__dirname, 'test_files')
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  // Create test PDF (simple text file with .pdf extension for testing)
  const pdf1Path = path.join(testDir, 'test_document_1.txt')
  fs.writeFileSync(
    pdf1Path,
    'This is a test document for multiple file upload functionality.\n' +
    'It contains sample text to test the backend ingestion service.\n' +
    'Document 1 - First test file'
  )

  const pdf2Path = path.join(testDir, 'test_document_2.txt')
  fs.writeFileSync(
    pdf2Path,
    'This is the second test document for multiple file upload.\n' +
    'Testing batch ingestion with multiple files simultaneously.\n' +
    'Document 2 - Second test file'
  )

  const pdf3Path = path.join(testDir, 'test_document_3.txt')
  fs.writeFileSync(
    pdf3Path,
    'This is the third test document for multiple file upload.\n' +
    'Verifying that the backend correctly processes three files at once.\n' +
    'Document 3 - Third test file'
  )

  return { pdf1Path, pdf2Path, pdf3Path, testDir }
}

// Test function for single file upload
async function testSingleFileUpload(filePath) {
  console.log('\n=== Testing Single File Upload ===')
  console.log(`File: ${path.basename(filePath)}`)

  const FormData = require('form-data')
  const formData = new FormData()
  formData.append('document_id', 'test_single_doc')
  formData.append('files', fs.createReadStream(filePath))

  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    })

    const data = await response.json()
    console.log('Response Status:', data.status)
    console.log('Message:', data.message)
    console.log('Files Processed:', data.count)
    console.log('Document ID:', data.document_id)
    console.log('Vector Store ID:', data.vector_store_id)
    console.log('Filenames:', data.filenames)

    if (response.ok) {
      console.log('✓ Single file upload test PASSED')
    } else {
      console.log('✗ Single file upload test FAILED')
    }

    return response.ok
  } catch (error) {
    console.error('✗ Single file upload test FAILED:', error.message)
    return false
  }
}

// Test function for multiple files upload
async function testMultipleFilesUpload(filePaths, documentId) {
  console.log(`\n=== Testing Multiple Files Upload (${filePaths.length} files) ===`)
  filePaths.forEach((fp) => console.log(`  - ${path.basename(fp)}`))

  const FormData = require('form-data')
  const formData = new FormData()
  formData.append('document_id', documentId)
  
  filePaths.forEach((filePath) => {
    formData.append('files', fs.createReadStream(filePath))
  })

  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    })

    const data = await response.json()
    console.log('Response Status:', data.status)
    console.log('Message:', data.message)
    console.log('Files Processed:', data.count)
    console.log('Document ID:', data.document_id)
    console.log('Vector Store ID:', data.vector_store_id)
    console.log('Filenames:', data.filenames)

    if (response.ok && data.count === filePaths.length) {
      console.log(`✓ Multiple files upload test PASSED (${data.count} files processed)`)
      return true
    } else {
      console.log(
        `✗ Multiple files upload test FAILED (Expected: ${filePaths.length}, Got: ${data.count})`
      )
      return false
    }
  } catch (error) {
    console.error('✗ Multiple files upload test FAILED:', error.message)
    return false
  }
}

// Test function for error handling (no document_id)
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===')

  const FormData = require('form-data')
  const formData = new FormData()
  // Intentionally omit document_id to test validation

  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    })

    const data = await response.json()

    if (!response.ok) {
      console.log('Error Status:', response.status)
      console.log('Error Message:', data.detail || data.error)
      console.log('✓ Error handling test PASSED (correctly rejected invalid request)')
      return true
    } else {
      console.log('✗ Error handling test FAILED (should have rejected request)')
      return false
    }
  } catch (error) {
    console.error('Error during test:', error.message)
    return false
  }
}

// Main test runner
async function runTests() {
  console.log('=====================================')
  console.log('Backend Multiple File Upload Test')
  console.log('=====================================')
  console.log(`API Base URL: ${API_BASE_URL}`)

  // Create test files
  const { pdf1Path, pdf2Path, pdf3Path, testDir } = createTestFiles()
  console.log(`\nTest files created in: ${testDir}`)

  const results = {
    single: false,
    double: false,
    triple: false,
    error: false
  }

  // Run tests
  try {
    results.single = await testSingleFileUpload(pdf1Path)
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between requests

    results.double = await testMultipleFilesUpload([pdf1Path, pdf2Path], 'test_batch_2files')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    results.triple = await testMultipleFilesUpload(
      [pdf1Path, pdf2Path, pdf3Path],
      'test_batch_3files'
    )
    await new Promise((resolve) => setTimeout(resolve, 1000))

    results.error = await testErrorHandling()
  } catch (error) {
    console.error('\nTest execution error:', error)
  }

  // Print summary
  console.log('\n=====================================')
  console.log('Test Summary')
  console.log('=====================================')
  console.log(`Single File Upload:      ${results.single ? '✓ PASSED' : '✗ FAILED'}`)
  console.log(`Two Files Upload:        ${results.double ? '✓ PASSED' : '✗ FAILED'}`)
  console.log(`Three Files Upload:      ${results.triple ? '✓ PASSED' : '✗ FAILED'}`)
  console.log(`Error Handling:          ${results.error ? '✓ PASSED' : '✗ FAILED'}`)

  const passed = Object.values(results).filter(Boolean).length
  console.log(`\nTotal: ${passed}/${Object.keys(results).length} tests passed`)
  console.log('=====================================\n')

  // Cleanup test files
  try {
    fs.rmSync(testDir, { recursive: true })
    console.log('Test files cleaned up')
  } catch (error) {
    console.error('Error cleaning up test files:', error.message)
  }

  process.exit(passed === Object.keys(results).length ? 0 : 1)
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { testSingleFileUpload, testMultipleFilesUpload }
