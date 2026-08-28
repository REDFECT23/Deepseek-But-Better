document.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById('chat');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKey');
    const closeModalBtn = document.getElementById('closeModal');

    let messages = [];
    let isLoading = false;

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) apiKeyInput.value = savedKey;

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

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
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text || isLoading) return;

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            settingsModal.classList.add('active');
            alert('Вставь API ключ в настройках!');
            return;
        }

        addMessage(text, 'user');
        messages.push({ role: 'user', parts: [{ text: text }] });
        userInput.value = '';
        userInput.style.height = 'auto';

        showTyping();
        isLoading = true;
        sendBtn.disabled = true;

        // ПРАВИЛЬНЫЙ URL для Gemini API
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-client': 'genai-js'
            },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.7
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
                messages.push({ role: 'model', parts: [{ text: reply }] });
            } else {
                addMessage('Пустой ответ от API', 'bot');
            }
        })
        .catch(err => {
            removeTyping();
            addMessage('Ошибка: ' + err.message, 'bot');
            console.error('Full error:', err);
        })
        .finally(() => {
            isLoading = false;
            sendBtn.disabled = false;
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
});
