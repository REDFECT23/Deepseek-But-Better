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

// Загрузка API ключа из localStorage
const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) apiKeyInput.value = savedKey;

// Настройки
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
saveKeyBtn.addEventListener('click', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
    settingsModal.classList.remove('active');
    alert('Ключ сохранён!');
});

// Автоувеличение textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// Отправка по Enter (Shift+Enter = новая строка)
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
        return;
    }

    // Добавляем сообщение пользователя
    addMessage(text, 'user');
    messages.push({ role: 'user', content: text });
    userInput.value = '';
    userInput.style.height = 'auto';

    // Показываем индикатор загрузки
    showTyping();
    isLoading = true;
    sendBtn.disabled = true;

    // Формируем историю для Gemini
    const conversationHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    // Запрос к Gemini API
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: conversationHistory,
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.7
            }
        })
    })
    .then(res => res.json())
    .then(data => {
        removeTyping();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const reply = data.candidates[0].content.parts[0].text;
            addMessage(reply, 'bot');
            messages.push({ role: 'assistant', content: reply });
        } else if (data.error) {
            addMessage('Ошибка: ' + data.error.message, 'bot');
        } else {
            addMessage('Непонятный ответ от API', 'bot');
        }
    })
    .catch(err => {
        removeTyping();
        addMessage('Ошибка сети: ' + err.message, 'bot');
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
}    const indicator = chat.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
