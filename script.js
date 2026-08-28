// Замени функцию sendMessage на эту:

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
    userInput.value = '';
    userInput.style.height = 'auto';

    showTyping();
    isLoading = true;
    sendBtn.disabled = true;

    // Формируем промпт с историей
    let prompt = text;
    if (messages.length > 0) {
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
        console.log('Ответ Gemini:', data); // Для отладки
        
        if (data.candidates && data.candidates[0]) {
            const reply = data.candidates[0].content.parts[0].text;
            addMessage(reply, 'bot');
            messages.push({ role: 'user', content: text });
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
