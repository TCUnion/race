import re
import os

filepath = 'src/features/admin/AdminPanel.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find alerts containing error.message or err.message
# Example: alert('儲存失敗: ' + err.message);
# Example: alert(`更新失敗: ${error.message}`);
# We will replace them with a generic alert, and put the original alert into a console.error

def replacer(match):
    original_alert = match.group(0)
    # Extract the inner part of alert
    inner_expr = match.group(1)
    
    # Check if the alert already has a generic fallback or is just err.message
    # We will log the error and show a generic message
    return f"console.error({inner_expr}); alert('操作失敗，請稍後再試。');"

# Match alert(...) where ... contains error.message or err.message
# This regex uses a negative lookahead to capture the content inside parentheses properly
pattern = re.compile(r"alert\(\s*([^;)]*(?:err\.message|error\w*\.message)[^;)]*)\s*\);", re.IGNORECASE)

# First find to see what we're replacing
matches = pattern.findall(content)
print(f"Found {len(matches)} generic error alerts to mask.")

new_content = pattern.sub(replacer, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement complete.")
