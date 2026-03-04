import re

filepath = 'src/features/admin/AdminPanel.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if "import DOMPurify from 'dompurify';" not in content:
    # find the last import and append
    q = content.find("import ")
    # Just insert it after the first row
    first_newline = content.find('\n', q)
    content = content[:first_newline+1] + "import DOMPurify from 'dompurify';\n" + content[first_newline+1:]

# 2. Add sanitizations
# fields to sanitize: team_name, name, title, content, description, race_description, shop_name
rules = [
    (r"team_name:\s*(editing\w+\.team_name),?", r"team_name: DOMPurify.sanitize(\1 || ''),"),
    (r"name:\s*(editing\w+\.name),?", r"name: DOMPurify.sanitize(\1 || ''),"),
    (r"title:\s*(editing\w+\.title),?", r"title: DOMPurify.sanitize(\1 || ''),"),
    (r"content:\s*(editing\w+\.content),?", r"content: DOMPurify.sanitize(\1 || ''),"),
    (r"description:\s*(editing\w+\.description),?", r"description: DOMPurify.sanitize(\1 || ''),"),
    (r"race_description:\s*(editing\w+\.race_description),?", r"race_description: DOMPurify.sanitize(\1 || ''),"),
    (r"shop_name:\s*(editing\w+\.shop_name),?", r"shop_name: DOMPurify.sanitize(\1 || ''),"),
]

for pattern, repl in rules:
    content = re.sub(pattern, repl, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Sanitization applied successfully.")
