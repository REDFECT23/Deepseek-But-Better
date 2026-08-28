document.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById('chat');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKey');
    const closeModalBtn = document.getElementById('closeModal');

    let isLoading = false;
    let chatHistory = [];
    let proactiveTimer = null;
    let lastUserMessageTime = Date.now();
    const PROACTIVE_DELAY = 120000;

    fetch('instructions.txt')
        .then(res => res.text())
        .then(text => {
            window.SYSTEM_INSTRUCTIONS = text;
            console.log('Инструкции загружены:', text.length, 'символов');
        })
        .catch(err => {
            console.error('Не удалось загрузить instructions.txt:', err);
            window.SYSTEM_INSTRUCTIONS = 'Ты живой собеседник. Отвечай кратко и по-человечески.';
        });

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) apiKeyInput.value = savedKey;

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    
    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            settingsModal.classList.remove('active');
            alert('Ключ сохранён!');
        }
    });

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        resetProactiveTimer();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    function analyzeUserStyle(text) {
        const style = [];
        
        if (text.length < 20) {
            style.push('Пользователь пишет ОЧЕНЬ КРАТКО. Ответь максимально коротко, 1-2 предложения.');
        } else if (text.length < 100) {
            style.push('Пользователь пишет кратко. Ответь тоже кратко, 2-3 предложения.');
        } else if (text.length > 500) {
            style.push('Пользователь пишет развёрнуто. Можешь ответить подробно.');
        }
        
        if (text === text.toUpperCase() && text.length > 5) {
            style.push('Пользователь пишет КАПСОМ — он эмоционален. Можешь ответить с энергией.');
        }
        
        if (text.includes('?')) {
            style.push('Пользователь задал вопрос. Ответь на него, но можешь задать встречный.');
        }
        
        if (/блин|блиять|хуй|пизд|ебат|да ладно|ага|ок|лол/i.test(text)) {
            style.push('Пользователь пишет неформально, использует сленг. Отвечай в том же стиле, без официоза.');
        }
        
        return style.join(' ');
    }

    function resetProactiveTimer() {
        clearTimeout(proactiveTimer);
        lastUserMessageTime = Date.now();
        
        proactiveTimer = setTimeout(() => {
            triggerProactiveMessage();
        }, PROACTIVE_DELAY);
    }

    async function triggerProactiveMessage() {
        if (isLoading) return;
        
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return;
        
        chatHistory.push({ 
            parts: [{ text: `[СИСТЕМА: Пользователь молчит. Напиши ему что-нибудь интересное.]` }] 
        });
        
        showTyping();
        isLoading = true;
        
        const model = "gemini-3.7-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'x-goog-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: chatHistory,
                    systemInstruction: {
                        parts: [{ text: window.SYSTEM_INSTRUCTIONS }]
                    }
                })
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            removeTyping();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                addMessage(reply, 'bot');
                chatHistory.push({ parts: [{ text: reply }] });
            }
        } catch (err) {
            removeTyping();
            console.error('Проактивная ошибка:', err);
        } finally {
            isLoading = false;
            resetProactiveTimer();
        }
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text || isLoading) return;

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            settingsModal.classList.add('active');
            alert('Сначала вставь API ключ в настройках (⚙️)!');
            return;
        }

        addMessage(text, 'user');
        chatHistory.push({ parts: [{ text: text }] });
        
        userInput.value = '';
        userInput.style.height = 'auto';

        showTyping();
        isLoading = true;
        sendBtn.disabled = true;

        const model = "gemini-3.7-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const userStyle = analyzeUserStyle(text);
        const adaptiveInstruction = userStyle ? `\n\n[АДАПТАЦИЯ: ${userStyle}]` : '';

        const adaptedHistory = [...chatHistory];
        if (adaptiveInstruction) {
            adaptedHistory.push({ 
                parts: [{ text: `[СИСТЕМНАЯ ПОДСКАЗКА: ${userStyle}]` }] 
            });
        }

        fetch(url, {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: adaptedHistory,
                systemInstruction: {
                    parts: [{ text: window.SYSTEM_INSTRUCTIONS }]
                },
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 300
                }
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(`${res.status}: ${text}`);
                });
            }
            return res.json();
        })
        .then(data => {
            removeTyping();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                addMessage(reply, 'bot');
                chatHistory.push({ parts: [{ text: reply }] });
            } else {
                addMessage('Пустой ответ.', 'bot');
            }
        })
        .catch(err => {
            removeTyping();
            addMessage('Ошибка: ' + err.message, 'bot');
            console.error('Ошибка:', err);
        })
        .finally(() => {
            isLoading = false;
            sendBtn.disabled = false;
            resetProactiveTimer();
        });
    }

    function addMessage(text, role) {
        const msg = document.createElement('div');
        msg.className = `message ${role}`;
        msg.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    }

    function showTyping() {
        const msg = document.createElement('div');
        msg.className = 'message bot typing-indicator';
        msg.innerHTML = `<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    }

    function removeTyping() {
        const indicator = chat.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    resetProactiveTimer();
});
