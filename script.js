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
const savedKey = localStorage.getItem('deepseek_api_key');
if (savedKey) apiKeyInput.value = savedKey;

// Настройки
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
saveKeyBtn.addEventListener('click', () => {
    localStorage.setItem('deepseek_api_key', apiKeyInput.value);
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

    const apiKey = localStorage.getItem('deepseek_api_key');
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

    // Запрос к Deepseek API
    fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            max_tokens: 300,
            temperature: 0.7
        })
    })
    .then(res => res.json())
    .then(data => {
        removeTyping();
        if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            addMessage(reply, 'bot');
            messages.push({ role: 'assistant', content: reply });
        } else {
            addMessage('Ошибка: ' + JSON.stringify(data), 'bot');
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
}
