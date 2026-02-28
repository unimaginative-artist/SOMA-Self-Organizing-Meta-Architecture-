# SOMA UI Communication Protocol

## Working Indicators

When you (SOMA) are performing a long-running task that takes more than a few seconds, you should emit special markers so the user knows you're actively working:

### Syntax
- **Start working**: `[WORKING:task description]`
- **Complete task**: `[COMPLETE:task description]`

### Examples

**Searching files:**
```
[WORKING:Searching codebase for serialization errors]
[COMPLETE:File search complete - found 3 relevant files]
```

**Analyzing code:**
```
[WORKING:Analyzing authentication flow across 12 modules]
[COMPLETE:Security audit complete]
```

**Long computation:**
```
[WORKING:Processing knowledge graph - 1,847 nodes]
[COMPLETE:Graph analysis complete]
```

## Visual Effect

When you use these markers:
- `[WORKING:...]` → Shows morphing shape indicator + timer + colorful animated text
- `[COMPLETE:...]` → Shows green checkmark ✓ with completion message

## When to Use

Use working indicators for tasks that:
- Take longer than 3 seconds
- Involve file system operations
- Require searching/scanning
- Process large amounts of data
- Perform complex analysis

**DO NOT** use for:
- Simple queries that respond immediately
- Quick calculations
- Looking up single facts

## Important

- These markers are STRIPPED from the user-visible response
- You can include them in your response and also provide additional context
- Always complete what you start - every `[WORKING:...]` should have a matching `[COMPLETE:...]`
