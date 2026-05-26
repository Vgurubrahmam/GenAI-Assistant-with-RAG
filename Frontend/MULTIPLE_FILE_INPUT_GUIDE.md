# Multiple File Upload UI Enhancement - Feature Guide

## ✨ New Features Added

### 1. **Add File Button** 
- Click "Add file" button to add multiple file input fields
- Each field allows selecting one or more files
- Dynamically add as many file inputs as needed

### 2. **Multiple File Input Fields**
Similar to Swagger UI array inputs:
```
┌─────────────────────────────────────────┐
│ Choose file    No file chosen      [×]  │
├─────────────────────────────────────────┤
│ Choose file    No file chosen      [×]  │
├─────────────────────────────────────────┤
│ Choose file    No file chosen           │
└─────────────────────────────────────────┘
     ↓
   [Add file]  ← Click to add more
```

### 3. **Remove File Input Button**
- Click the [×] button to remove individual file input fields
- Only shows when there's more than one input field

### 4. **Selected Files Summary**
- Shows all selected files with:
  - File icon
  - File name
  - File size (in MB)
  - Remove button for each file
  
```
Selected files (3):
┌────────────────────────────────────────┐
│ 📄 document1.pdf       2.50 MB   [×]   │
├────────────────────────────────────────┤
│ 📄 notes.txt           0.50 MB   [×]   │
├────────────────────────────────────────┤
│ 📄 research.pdf        3.25 MB   [×]   │
└────────────────────────────────────────┘
```

---

## 🎯 How to Use

### Step 1: Add File Inputs
1. Click "Add file" button to create a new file input field
2. Repeat as many times as needed
3. Each input appears with a remove button (×)

### Step 2: Select Files
1. Click "Choose file" button for each input field
2. The system accumulates all selected files
3. Files from all inputs are combined

### Step 3: View Selected Files
1. All selected files appear in the "Selected files" section
2. Shows file size for each file
3. Click × to remove any individual file

### Step 4: Upload
1. Enter Document ID
2. Click "Upload" button
3. All selected files are uploaded as one batch

---

## 💻 Code Implementation Details

### New State Variables
```javascript
const [fileInputs, setFileInputs] = useState([{ id: 1 }])
const fileInputRefs = useRef({})
```

### New Handler Functions
```javascript
// Add a new file input field
handleAddFileInput() 
  → Creates new input with unique ID

// Remove a file input field
handleRemoveFileInput(inputId)
  → Removes input field by ID

// Handle files from any input
handleFilesPicked(e, inputId)
  → Accumulates files from multiple inputs
```

### Key Changes
- **Before**: Single file input with `multiple` attribute
- **After**: Multiple individual file input fields with add/remove buttons
- **Behavior**: Files accumulate from all input fields into one array
- **Display**: Shows selected files summary with sizes

---

## 🔄 Data Flow

```
Add File Input
  ↓ handleAddFileInput()
  ↓ Creates new input with unique ID
  ↓
Choose File (from any input)
  ↓ handleFilesPicked()
  ↓ Accumulates to files array
  ↓
Selected Files Summary Display
  ↓ Shows all files from all inputs
  ↓
Remove File
  ↓ handleRemoveFile()
  ↓ Removes from files array
  ↓
Upload
  ↓ All files sent together to backend
```

---

## ✅ Features

| Feature | Before | After |
|---------|--------|-------|
| **Multiple file inputs** | ✗ Single | ✓ Multiple |
| **Add button** | ✗ No | ✓ Yes |
| **Remove input button** | ✗ No | ✓ Yes |
| **File size display** | ✗ No | ✓ Yes (in MB) |
| **File summary section** | ✗ No | ✓ Yes |
| **Remove per file** | ✓ Yes | ✓ Yes |
| **File validation** | ✓ Yes | ✓ Yes |

---

## 📋 Component Structure

```
DocumentUpload
├── State
│   ├── files[]              (accumulated from all inputs)
│   ├── documentId           (batch name)
│   ├── fileInputs[]         (array of input fields)
│   ├── fileInputRefs        (references to each input)
│   ├── loading, error, success
│   
├── Handlers
│   ├── handleFilesPicked()     (adds files from any input)
│   ├── handleRemoveFile()      (removes individual file)
│   ├── handleAddFileInput()    (adds new input field)
│   ├── handleRemoveFileInput() (removes input field)
│   └── handleSubmit()          (uploads all files)
│
└── UI
    ├── Document ID input
    ├── File input fields (dynamic)
    │   ├── Choose file button
    │   ├── Filename display
    │   └── Remove input button (×)
    ├── Add file button
    ├── Selected files summary
    ├── Error/Success messages
    └── Upload button
```

---

## 🎨 UI Layout

```
┌──────────────────────────────────────────────┐
│         Upload Documents                     │
├──────────────────────────────────────────────┤
│                                              │
│ Document ID *                                │
│ ┌──────────────────────────────────────────┐ │
│ │ my_research_papers                       │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Files (PDF or TXT) *                         │
│                                              │
│ [Choose file]     No file chosen      [×]   │
│ [Choose file]     No file chosen      [×]   │
│ [Choose file]     No file chosen      [×]   │
│ [Choose file]     No file chosen           │
│                                              │
│ ┌──────────────────────────────┐            │
│ │ [+] Add file                 │            │
│ └──────────────────────────────┘            │
│                                              │
│ Selected files (3):                          │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ 📄 document.pdf      2.50 MB   [×]   │    │
│ ├──────────────────────────────────────┤    │
│ │ 📄 notes.txt         0.50 MB   [×]   │    │
│ ├──────────────────────────────────────┤    │
│ │ 📄 research.pdf      3.25 MB   [×]   │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ Supported: PDF and TXT files                │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │        [Upload Enabled]              │    │
│ └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🔄 Usage Scenarios

### Scenario 1: Single File
1. First input already present
2. Click "Choose file"
3. Select one file
4. Click "Upload"

### Scenario 2: Two Files
1. First input present
2. Click "Add file" → Second input appears
3. Choose file from first input
4. Choose file from second input
5. Click "Upload" (both files sent)

### Scenario 3: Multiple Files (3+)
1. Click "Add file" multiple times
2. Each time a new input field appears
3. Select files from each input
4. All files accumulate
5. Click "Upload" (all files sent together)

### Scenario 4: Remove and Add
1. Added 5 input fields
2. Changed mind on field 3, click ×
3. Field 3 removed
4. Still have 4 inputs available
5. Click "Add file" to add more

---

## 🚀 Benefits

✅ **Better UX** - Similar to Swagger/REST API UI  
✅ **Flexible** - Add as many inputs as needed  
✅ **Visual Feedback** - See all selected files with sizes  
✅ **Easy Management** - Remove files or input fields individually  
✅ **Backward Compatible** - Existing functionality preserved  

---

## 🔒 Validation

All validations still work:
- ✓ File type check (PDF, TXT only)
- ✓ Document ID required
- ✓ At least one file required
- ✓ Error messages displayed
- ✓ Disabled during upload

---

## 📝 Notes

- **Input accumulation**: Files from all inputs combine into one array
- **File size display**: Shows human-readable MB format
- **Remove button**: Only shows when multiple inputs exist
- **Backend**: No changes needed - same API still works
- **Single upload**: Still supports old behavior

---

## Testing

### Manual Test Cases

1. **Add single file**
   - Open form
   - Click "Choose file"
   - Select one file
   - Verify file appears in selected list
   - Click Upload

2. **Add multiple via multiple inputs**
   - Click "Add file" (adds 2nd input)
   - Click "Add file" again (adds 3rd input)
   - Select files from each input
   - Verify all appear in selected list
   - Click Upload

3. **Remove input field**
   - Add 3 inputs
   - Click × on 2nd input
   - Verify only 2 inputs remain
   - 2 selected files should still show

4. **Remove selected file**
   - Select 3 files
   - Click × on 2nd file
   - Verify only 2 files in selected list
   - Upload remaining 2

5. **File size display**
   - Select files of different sizes
   - Verify MB values show correctly
   - Large files (>1MB) show with decimals

---

**Version**: 1.0  
**Date**: January 31, 2026  
**Status**: ✓ Complete
