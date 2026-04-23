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
        
        textarea.addEventListener("keydown", (e) => {
            // Cmd + Enter for newline
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + "\n" + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            } 
            // Simple Enter to Submit
            else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                cleanup(textarea.value);
            }
        });

        const btnDiv = document.createElement("div");
        btnDiv.style.cssText = "display:flex; justify-content:flex-end; gap:10px;";
        
        const btnSkip = document.createElement("button");
        btnSkip.innerText = "Skip / Clear";
        btnSkip.onclick = () => cleanup("");
        
        const btnSubmit = document.createElement("button");
        btnSubmit.innerText = "Submit (Enter)";
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

module.exports = async (params) => {
    const { app } = params;
    
    try {
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("⚠️ Please open a daily note first!");
            return;
        }

        const allFiles = app.vault.getFiles();
        // Use the exact relative path inside the vault
        const configFile = app.vault.getAbstractFileByPath("system/Prompt_Config.md");
        
        if (!configFile) {
            new Notice("⚠️ Error: Prompt_Config.md not found!");
            return;
        }
        
        // 1. Setup Yesterday's Data retrieval for defaults
        const title = activeFile.basename;
        const yesterdayStr = moment(title, "YYYY-MM-DD").subtract(1, 'days').format("YYYY-MM-DD");
        const yesterdayFile = allFiles.find(f => f.basename === yesterdayStr);
        let yesterdayContent = yesterdayFile ? await app.vault.read(yesterdayFile) : "";

        function getYesterdayAnswer(questionText) {
            if (!yesterdayContent) return "";
            const lines = yesterdayContent.split("\n");
            let capturing = false;
            let answerLines = [];
            for (let line of lines) {
                if (!capturing) {
                    if (line.includes(questionText)) {
                        const colonIndex = line.indexOf(":");
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
            let finalAns = answerLines.join("\n").trim();
            return (finalAns === "Skipped") ? "" : finalAns;
        }

        const configContent = await app.vault.read(configFile);
        const questions = configContent.split("\n").filter(q => q.trim() !== "");
        const tracking = questions.map(q => {
            let cleanQ = q.endsWith("?") ? q : q + "?";
            return { key: `- ${cleanQ}:`, prompt: cleanQ };
        });

        let content = app.workspace.activeEditor?.editor?.getValue() || await app.vault.read(activeFile);
        let updated = false;

        for (let item of tracking) {
            if (content.includes(item.key)) {
                // Update Existing
                const keyIndex = content.indexOf(item.key);
                const valueStartIndex = keyIndex + item.key.length;
                let nextDash = content.indexOf("\n- ", valueStartIndex);
                let nextHeader = content.indexOf("\n#", valueStartIndex);
                let possibleEnds = [nextDash, nextHeader].filter(i => i !== -1);
                let trueEndIndex = possibleEnds.length > 0 ? Math.min(...possibleEnds) : content.length;
                
                const currentAnswer = content.substring(valueStartIndex, trueEndIndex).trim();
                const newAnswer = await askUser(`Update: ${item.prompt}`, currentAnswer);

                if (newAnswer !== undefined && newAnswer !== currentAnswer) { 
                    content = content.substring(0, valueStartIndex) + " " + newAnswer.trim() + content.substring(trueEndIndex);
                    updated = true;
                }
            } else {
                // --- SCENARIO 2: INJECT MISSING (FIXED FOR SEQUENTIAL ORDER) ---
                const defaultAns = getYesterdayAnswer(item.prompt);
                const newAnswer = await askUser(`Missing: ${item.prompt}`, defaultAns);

                if (newAnswer !== undefined) {
                    const finalAnswer = newAnswer.trim() === "" ? "Skipped" : newAnswer.trim();
                    const newString = `${item.key} ${finalAnswer}`;
                    
                    let lines = content.split('\n');
                    let headerIndex = lines.findIndex(l => l.includes("🤖 Agent Prompts"));
                    
                    if (headerIndex !== -1) {
                        // Calculate offset to find the end of the current bulleted list
                        let insertOffset = 1;
                        while (lines[headerIndex + insertOffset] !== undefined && 
                               lines[headerIndex + insertOffset].trim().startsWith("- ")) {
                            insertOffset++;
                        }
                        // Splice at the calculated end of the list instead of the top
                        lines.splice(headerIndex + insertOffset, 0, newString);
                    } else {
                        // If header doesn't exist, create it at the bottom
                        lines.push("", "## 🤖 Agent Prompts", newString);
                    }
                    
                    content = lines.join('\n');
                    updated = true;
                }
            }
        }

        if (updated) {
            if (app.workspace.activeEditor?.editor) app.workspace.activeEditor.editor.setValue(content);
            else await app.vault.modify(activeFile, content);
            new Notice("✅ Agent Prompts Updated!");
        }
    } catch (error) {
        new Notice(`⚠️ Error: ${error.message}`);
    }
};