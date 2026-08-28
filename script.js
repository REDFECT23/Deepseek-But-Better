// Ждём полной загрузки страницы
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

    // Проверка что все элементы найдены
    console.log('Элементы:', {
        chat: !!chat,
        userInput: !!userInput,
        sendBtn: !!sendBtn,
        settingsBtn: !!settingsBtn,
        settingsModal: !!settingsModal
    });

    // Загрузка API ключа
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
        console.log('Ключ найден в localStorage');
    }

    // Кнопка настроек
    settingsBtn.addEventListener('click', () => {
        console.log('Клик по настройкам!');
        settingsModal.classList.add('active');
    });

    // Закрыть модалку
    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    // Сохранить ключ
    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            settingsModal.classList.remove('active');
            alert('Ключ сохранён! Теперь можешь писать сообщения.');
        } else {
            alert('Вставь ключ!');
        }
    });

    // Автоувеличение textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    });

    // Отправка по Enter
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
            alert('Сначала вставь API ключ Gemini в настройках!');
            return;
        }

        addMessage(text, 'user');
        messages.push({ role: 'user', content: text });
        userInput.value = '';
        userInput.style.height = 'auto';

        showTyping();
        isLoading = true;
        sendBtn.disabled = true;

        // Формируем промпт с историей
        let prompt = text;
        if (messages.length > 1) {
            prompt = messages.map(m => 
                `${m.role === 'user' ? 'Человек' : 'ИИ'}: ${m.content}`
            ).join('\n') + `\nЧеловек: ${text}\nИИ:`;
        }

        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.7
                }
            })
        })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(data => {
            removeTyping();
            console.log('Ответ:', data);
            
            if (data.candidates && data.candidates[0]) {
                const reply = data.candidates[0].content.parts[0].text;
                addMessage(reply, 'bot');
                messages.push({ role: 'assistant', content: reply });
            } else if (data.error) {
                addMessage('Ошибка: ' + data.error.message, 'bot');
            } else {
                addMessage('Пустой ответ', 'bot');
            }
        })
        .catch(err => {
            removeTyping();
            addMessage('Ошибка: ' + err.message, 'bot');
            console.error(err);
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
