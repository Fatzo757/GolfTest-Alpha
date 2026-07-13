import re

with open("src/components/Settings.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
inserted_tabs = False
section_map = {
    "Display Scale": "display",
    "Audio Control": "audio",
    "Time & Regional": "preferences",
    "Visual Theme": "display",
    "Layout Style": "display",
    "Card Artwork Style": "display",
    "Card Back Design": "display",
    "Card Back Color": "display",
    "Card Back Secondary Color": "display",
    "Security": "account",
    "Push Notifications": "preferences",
    "Profile Customization": "account",
    "Experimental Features": "preferences",
    "Reset Device Cache": "account"
}

current_tab = None

for i, line in enumerate(lines):
    if "const [theme, setTheme] = useState" in line and not inserted_tabs:
        new_lines.append("  const [activeTab, setActiveTab] = useState<'display' | 'audio' | 'preferences' | 'account'>('display');\n")
        inserted_tabs = True

    if '<div className="p-8 space-y-8 overflow-y-auto' in line:
        # Add the tab bar right before this
        tab_bar = """        <div className="flex border-b-4 border-ui-border bg-bg-dark flex-shrink-0 sticky top-0 z-10">
          {(['display', 'audio', 'preferences', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-[10px] md:text-[12px] uppercase font-bold border-b-4 transition-all ${activeTab === tab ? 'border-ui-yellow text-ui-yellow bg-ui-yellow/5' : 'border-transparent text-ui-gray hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
"""
        new_lines.append(tab_bar)
        new_lines.append(line)
        continue

    # Detect section starts by looking ahead for the h3 title
    if '<section ' in line:
        title = None
        for j in range(i, min(i+5, len(lines))):
            m = re.search(r'<h3[^>]*>(.*?)</h3>', lines[j])
            if m:
                title = m.group(1)
                break
        
        if title and title in section_map:
            current_tab = section_map[title]
            new_lines.append(f"          {{activeTab === '{current_tab}' && (\n")
            # Remove border-t if it exists
            line = line.replace(' pt-4 border-t border-ui-border/20', '')
            
    new_lines.append(line)
    
    if current_tab and '</section>' in line:
        new_lines.append(f"          )}}\n")
        current_tab = None

with open("src/components/Settings.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Updated Settings.tsx successfully")
