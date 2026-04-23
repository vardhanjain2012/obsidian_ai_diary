module.exports = async (params) => {
    return new Promise((resolve) => {
        // --- 1. CREATE THE BACKGROUND OVERLAY ---
        const bg = document.createElement("div");
        bg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; flex-direction:column; align-items:center; padding-top:20vh;";
        
        // --- 2. CREATE THE SEARCH CONTAINER ---
        const box = document.createElement("div");
        box.style.cssText = "background:var(--background-primary); border-radius:12px; width:650px; max-width:90vw; box-shadow:0 10px 30px rgba(0,0,0,0.6); border:1px solid var(--background-modifier-border); display:flex; flex-direction:column; overflow:hidden;";
        
        // --- 3. CREATE THE INPUT FIELD ---
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Ask your vault anything... (Press Esc to close)";
        input.style.cssText = "width:100%; padding:20px; font-size:18px; font-family:var(--font-interface); background:transparent; border:none; color:var(--text-normal); outline:none;";
        
        // --- 4. CREATE THE ANSWER AREA ---
        // FIX: Added 'user-select: text' and '-webkit-user-select: text' to allow highlighting
        const outputArea = document.createElement("div");
        outputArea.style.cssText = "display:none; padding:20px; border-top:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); font-family:var(--font-interface); font-size:16px; line-height:1.6; max-height:50vh; overflow-y:auto; white-space:pre-wrap; user-select:text; -webkit-user-select:text; cursor:text; position:relative;";
        
        // --- NEW: COPY BUTTON ---
        const copyBtn = document.createElement("button");
        copyBtn.innerText = "Copy";
        copyBtn.style.cssText = "position:absolute; top:10px; right:10px; padding:4px 8px; font-size:12px; background:var(--interactive-accent); color:var(--text-on-accent); border:none; border-radius:4px; cursor:pointer; display:none;";
        
        // Copy logic
        copyBtn.onclick = () => {
            // Copy just the text, ignoring HTML tags
            const textToCopy = outputArea.innerText.replace("Copy\n", "").trim(); 
            navigator.clipboard.writeText(textToCopy);
            copyBtn.innerText = "Copied!";
            setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
        };
        
        // --- 5. BEHAVIOR LOGIC ---
        function closeUI() {
            document.body.removeChild(bg);
            resolve();
        }

        // Close on clicking the blurred background
        bg.addEventListener("click", (e) => { 
            if (e.target === bg) closeUI(); 
        });
        
        input.addEventListener("keydown", async (e) => {
            if (e.key === "Escape") closeUI();
            
            if (e.key === "Enter" && input.value.trim() !== "") {
                e.preventDefault();
                const query = input.value.trim();
                
                outputArea.style.display = "block";
                copyBtn.style.display = "none"; // Hide button while loading
                outputArea.innerHTML = `<span style="color:var(--text-muted);"><i>Querying local agent...</i></span>`;
                input.disabled = true;

                try {
                    const res = await fetch("http://localhost:8000/ask", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ question: query })
                    });
                    
                    if (!res.ok) throw new Error("Server error");
                    
                    const data = await res.json();
                    
                    // Display answer and add the copy button
                    outputArea.innerHTML = data.answer;
                    outputArea.appendChild(copyBtn);
                    copyBtn.style.display = "block";
                    
                } catch (err) {
                    outputArea.innerHTML = `<span style="color:var(--text-error);"><b>Connection Failed:</b> Server issue.</span>`;
                } finally {
                    input.disabled = false;
                    input.focus();
                }
            }
        });

        // Assemble and render
        box.appendChild(input);
        box.appendChild(outputArea);
        bg.appendChild(box);
        document.body.appendChild(bg);

        input.focus();
    });
}