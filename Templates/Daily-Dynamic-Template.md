---
date: <% tp.file.title %>
---
## 🤖 Agent Prompts

<%*
// --- THE PURE HTML/JS POP-UP (NO OBSIDIAN API REQUIRED) ---
function askUser(title, defaultText) {
    return new Promise((resolve) => {
        const bg = document.createElement("div");
        bg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center;";
        
        const box = document.createElement("div");
        box.style.cssText = "background:var(--background-primary); padding:20px; border-radius:8px; width:500px; max-width:90vw; box-shadow:0 4px 10px rgba(0,0,0,0.5); border:1px solid var(--background-modifier-border);";
        
        const h3 = document.createElement("h3");
        h3.innerText = title;
        h3.style.cssText = "margin-top:0; color:var(--text-normal); font-family:var(--font-interface);";
        
        const textarea = document.createElement("textarea");
        textarea.value = defaultText;
        textarea.style.cssText = "width:100%; height:150px; margin-bottom:15px; padding:10px; background:var(--background-modifier-form-field); color:var(--text-normal); border:1px solid var(--background-modifier-border); border-radius:4px; resize:vertical; font-family:var(--font-interface); font-size:16px;";
        
        // CATCH THE ENTER KEY
        textarea.addEventListener("keydown", (e) => { // 1. Cmd + Enter: Add a new line 
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); const start = textarea.selectionStart; 
        const end = textarea.selectionEnd; textarea.value = textarea.value.substring(0, start) + "\n" + textarea.value.substring(end); textarea.selectionStart = textarea.selectionEnd = start + 1; 
        } // 2. Simple Enter: Submit the answer 
        else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); cleanup(textarea.value); 
        } 
        });

        const btnDiv = document.createElement("div");
        btnDiv.style.cssText = "display:flex; justify-content:flex-end; gap:10px;";
        
        const btnSkip = document.createElement("button");
        btnSkip.innerText = "Skip / Clear";
        btnSkip.onclick = () => cleanup("");
        
        const btnSubmit = document.createElement("button");
        btnSubmit.innerText = "Submit (Cmd/Ctrl + Enter)";
        btnSubmit.className = "mod-cta";
        btnSubmit.onclick = () => cleanup(textarea.value);
        
        btnDiv.appendChild(btnSkip);
        btnDiv.appendChild(btnSubmit);
        box.appendChild(h3);
        box.appendChild(textarea);
        box.appendChild(btnDiv);
        bg.appendChild(box);
        document.body.appendChild(bg);
        
        textarea.focus();
        
        function cleanup(result) {
            document.body.removeChild(bg);
            resolve(result);
        }
    });
}
// ------------------------------------------

let output = "";
try {
    const allFiles = app.vault.getFiles();
    const configFile = app.vault.getAbstractFileByPath("system/Prompt_Config.md");
    
    const title = tp.file.title;
    let yesterdayStr = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(title)) {
        yesterdayStr = tp.date.now("YYYY-MM-DD", -1, title, "YYYY-MM-DD");
    } else {
        yesterdayStr = tp.date.now("YYYY-MM-DD", -1);
    }

    const yesterdayFile = allFiles.find(f => f.basename === yesterdayStr);
    
    let yesterdayContent = "";
    if (yesterdayFile) {
        yesterdayContent = await app.vault.read(yesterdayFile);
    }

    function getYesterdayAnswer(questionText) {
        if (!yesterdayContent) return "";
        const lines = yesterdayContent.split("\n");
        let capturing = false;
        let answerLines = [];
        
        for (let line of lines) {
            if (!capturing) {
                if (line.includes(questionText)) {
                    const qIndex = line.indexOf(questionText);
                    const colonIndex = line.indexOf(":", qIndex);
                    if (colonIndex !== -1) {
                        let firstLineAns = line.substring(colonIndex + 1).trim();
                        if (firstLineAns) answerLines.push(firstLineAns);
                        capturing = true; 
                    }
                }
            } else {
                if (line.trim().startsWith("- ") || line.trim().startsWith("#")) break; 
                answerLines.push(line); 
            }
        }
        let finalAnswer = answerLines.join("\n").trim();
        return (finalAnswer === "Skipped" || finalAnswer === "") ? "" : finalAnswer;
    }

    if (!configFile) {
        tR += "> [!error] **Config Missing**\n> `Prompt_Config.md` not found!\n\n";
    } else {
        const configContent = await app.vault.read(configFile);
        const questions = configContent.split("\n").filter(q => q.trim() !== "");

        for (let q of questions) {
            let cleanQ = q.endsWith("?") ? q : q + "?";
            let defaultAnswer = getYesterdayAnswer(cleanQ);
            
            let answer = await askUser(cleanQ, defaultAnswer);
            
            output += `- ${cleanQ}: ${answer || "Skipped"}\n`;
        }
        tR += output;
    }
} catch (error) {
    tR += `> [!error] **Template Crash**\n> ${error.message}\n\n`;
}
_%>

## 🧠 Brain Dump
*Write your unstructured thoughts below.*