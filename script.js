// 存储所有单词数据
let allWords = [];
// 存储每轮复习的单词
let reviewRounds = Array(9).fill().map(() => []);
// 当前复习轮次
let currentRound = 0;
// 当前单词索引
let currentWordIndex = 0;
// 存储可用的语音
let voices = [];
// 添加用户相关变量
let currentUser = null;
// 在文件开头添加重点单词相关变量
let importantWords = new Set();
// 添加追加模式状态变量
let isAppendMode = false;
// 添加显示模式变量
let showEnglish = true; // true显示英文，false显示中文

// 添加授权码列表和通用授权码
const AUTH_CODES = new Set([
    'SUN2024A01', 'SUN2024A02',
    'SUN2024A03', 'SUN2024A04',
    'SUN2024A05', 'SUN2024A06',
    'SUN2024A07', 'SUN2024A08',
    'SUN2024A09', 'SUN2024A10',
    'SUN2024B01', 'SUN2024B02',
    'SUN2024B03', 'SUN2024B04',
    'SUN2024B05', 'SUN2024B06',
    'SUN2024B07', 'SUN2024B08',
    'SUN2024B09', 'SUN2024B10',
    'SUNNY888888' // 通用授权码
]);

// 设置到期时间
const EXPIRATION_DATE = new Date('2024-03-31T23:59:59+08:00');

// 修改日期比较函数
function isExpired() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expirationDay = new Date(EXPIRATION_DATE.getFullYear(), EXPIRATION_DATE.getMonth(), EXPIRATION_DATE.getDate());
    return today > expirationDay;
}

// 初始化语音
function initVoices() {
    // 等待语音列表加载完成
    window.speechSynthesis.onvoiceschanged = function() {
        voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.includes('en'));
        console.log('可用的英语语音：', voices);
    };
    // 首次加载语音列表
    voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.includes('en'));
}

// 页面加载完成后初始化语音
window.onload = function() {
    initVoices();
};

// 使用浏览器的语音合成功能发音
function speak(text, voiceIndex = 0) {
    if ('speechSynthesis' in window) {
        // 取消之前的语音
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        // 如果有可用的英语语音，使用第一个
        if (voices.length > voiceIndex) {
            utterance.voice = voices[voiceIndex];
        }
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // 添加语音事件监听
        utterance.onstart = () => console.log('开始播放语音');
        utterance.onend = () => console.log('语音播放结束');
        utterance.onerror = (event) => console.error('语音播放错误：', event);

        window.speechSynthesis.speak(utterance);
    } else {
        console.log('浏览器不支持语音合成');
    }
}

// 使用不同的声音发音
function speakWithDifferentVoice(text) {
    const currentVoiceIndex = Math.floor(Math.random() * voices.length);
    speak(text, currentVoiceIndex);
}

// 发音当前单词
function pronounceWord() {
    const currentWord = reviewRounds[currentRound][currentWordIndex];
    if (currentWord) {
        speakWithDifferentVoice(currentWord.word);
    }
}

// 更新单词列表显示
function updateWordList() {
    const wordListDiv = document.getElementById('wordList');
    wordListDiv.innerHTML = '';
    
    const toggleContainer = document.createElement('div');
    toggleContainer.style.marginBottom = '10px';
    toggleContainer.style.textAlign = 'right';
    
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleDisplayMode';
    toggleButton.className = 'control-button';
    toggleButton.textContent = showEnglish ? '显示中文' : '显示英文';
    toggleButton.onclick = toggleDisplayMode;
    toggleButton.style.marginBottom = '10px';
    
    toggleContainer.appendChild(toggleButton);
    wordListDiv.appendChild(toggleContainer);
    
    allWords.forEach((word, index) => {
        // 只显示已学习过的单词（attempts > 0）
        if (word.attempts > 0) {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-list-item';
            wordItem.style.display = 'flex';
            wordItem.style.alignItems = 'center';
            wordItem.style.gap = '5px';
            wordItem.style.position = 'relative';
            wordItem.style.minHeight = '40px';
            
            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.display = 'flex';
            contentContainer.style.alignItems = 'center';
            contentContainer.style.gap = '5px';
            contentContainer.style.minWidth = '0';
            contentContainer.style.marginRight = '150px';
            
            // 创建重点标记（红点）
            const importantDot = document.createElement('span');
            importantDot.style.width = '6px';
            importantDot.style.height = '6px';
            importantDot.style.borderRadius = '50%';
            importantDot.style.backgroundColor = importantWords.has(word.word) ? '#ff4444' : 'transparent';
            importantDot.style.display = 'inline-block';
            importantDot.style.flexShrink = '0';
            importantDot.style.marginRight = '3px';
            importantDot.style.cursor = 'pointer';
            importantDot.onclick = () => {
                if (importantWords.has(word.word)) {
                    importantWords.delete(word.word);
                    importantDot.style.backgroundColor = 'transparent';
                    updateImportantWordList();
                } else {
                    importantWords.add(word.word);
                    importantDot.style.backgroundColor = '#ff4444';
                    updateImportantWordList();
                }
                updateProgress();
                saveUserData();
            };
            
            const english = document.createElement('span');
            english.className = 'word-english';
            english.textContent = word.word;
            english.style.minWidth = 'auto';
            english.style.display = showEnglish ? 'inline-block' : 'none';
            english.style.marginRight = '5px';
            
            const phonetic = document.createElement('span');
            phonetic.className = 'word-phonetic';
            phonetic.textContent = word.phonetic || '';
            phonetic.style.minWidth = 'auto';
            phonetic.style.display = showEnglish ? 'inline-block' : 'none';
            phonetic.style.marginRight = '5px';
            
            const chinese = document.createElement('span');
            chinese.className = 'word-chinese';
            chinese.textContent = word.meaning;
            chinese.style.display = showEnglish ? 'none' : 'inline-block';
            chinese.style.minWidth = 'auto';
            chinese.style.marginTop = '0';
            
            // 创建按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '5px';
            buttonContainer.style.position = 'absolute';
            buttonContainer.style.right = '0';
            buttonContainer.style.top = '50%';
            buttonContainer.style.transform = 'translateY(-50%)';
            buttonContainer.style.backgroundColor = '#fff';
            buttonContainer.style.padding = '0 5px';
            
            const pronunciationBtn = document.createElement('button');
            pronunciationBtn.className = 'control-button';
            pronunciationBtn.style.padding = '2px 8px';
            pronunciationBtn.style.fontSize = '12px';
            pronunciationBtn.style.width = '40px';
            pronunciationBtn.style.backgroundColor = '#4CAF50';
            pronunciationBtn.innerHTML = '🔊';
            pronunciationBtn.onclick = () => speakWithDifferentVoice(word.word);
            
            const toggleWordButton = document.createElement('button');
            toggleWordButton.className = 'control-button';
            toggleWordButton.style.padding = '2px 8px';
            toggleWordButton.style.fontSize = '12px';
            toggleWordButton.style.width = '40px';
            toggleWordButton.style.backgroundColor = '#008CBA';
            toggleWordButton.textContent = '显';
            toggleWordButton.onclick = () => {
                if (showEnglish) {
                    chinese.style.display = chinese.style.display === 'none' ? 'inline-block' : 'none';
                    toggleWordButton.textContent = chinese.style.display === 'none' ? '显' : '隐';
                } else {
                    english.style.display = english.style.display === 'none' ? 'inline-block' : 'none';
                    phonetic.style.display = english.style.display;
                    toggleWordButton.textContent = english.style.display === 'none' ? '显' : '隐';
                }
            };
            
            const statusButton = document.createElement('button');
            statusButton.className = 'control-button';
            statusButton.style.padding = '2px 8px';
            statusButton.style.fontSize = '12px';
            statusButton.style.width = '40px';
            statusButton.style.backgroundColor = word.mastered ? '#4CAF50' : '#f44336';
            statusButton.innerHTML = word.mastered ? '✅' : '❌';
            
            buttonContainer.appendChild(pronunciationBtn);
            buttonContainer.appendChild(toggleWordButton);
            buttonContainer.appendChild(statusButton);
            
            contentContainer.appendChild(importantDot);
            contentContainer.appendChild(english);
            contentContainer.appendChild(phonetic);
            contentContainer.appendChild(chinese);
            
            wordItem.appendChild(contentContainer);
            wordItem.appendChild(buttonContainer);
            
            wordListDiv.appendChild(wordItem);
        }
    });
    
    updateImportantWordList();
}

// 创建按钮组函数
function createButtonGroup(word, chinese, english, phonetic, line, isEnglishLine) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';
    buttonContainer.style.marginLeft = 'auto';
    buttonContainer.style.flexShrink = '0';
    
    // 添加发音按钮
    const pronunciationBtn = document.createElement('button');
    pronunciationBtn.className = 'control-button';
    pronunciationBtn.style.padding = '2px 8px';
    pronunciationBtn.style.fontSize = '12px';
    pronunciationBtn.style.width = '60px';
    pronunciationBtn.style.backgroundColor = '#4CAF50';
    pronunciationBtn.innerHTML = '🔊';
    pronunciationBtn.onclick = () => speakWithDifferentVoice(word.word);
    
    // 添加显示/隐藏按钮
    const toggleButton = document.createElement('button');
    toggleButton.className = 'control-button';
    toggleButton.style.padding = '2px 8px';
    toggleButton.style.fontSize = '12px';
    toggleButton.style.width = '60px';
    toggleButton.style.backgroundColor = '#008CBA';
    toggleButton.textContent = '显示';
    toggleButton.onclick = () => {
        if (showEnglish) {
            chinese.style.display = chinese.style.display === 'none' ? 'inline-block' : 'none';
            toggleButton.textContent = chinese.style.display === 'none' ? '显示' : '隐藏';
            line.nextSibling.style.display = chinese.style.display === 'none' ? 'none' : 'flex';
        } else {
            english.style.display = english.style.display === 'none' ? 'inline-block' : 'none';
            phonetic.style.display = english.style.display;
            toggleButton.textContent = english.style.display === 'none' ? '显示' : '隐藏';
            line.previousSibling.style.display = english.style.display === 'none' ? 'none' : 'flex';
        }
    };
    
    // 添加掌握状态按钮
    const statusButton = document.createElement('button');
    statusButton.className = 'control-button';
    statusButton.style.padding = '2px 8px';
    statusButton.style.fontSize = '12px';
    statusButton.style.width = '60px';
    statusButton.style.backgroundColor = word.mastered ? '#4CAF50' : '#f44336';
    statusButton.innerHTML = word.mastered ? '✅' : '❌';
    
    // 将所有按钮添加到按钮容器
    buttonContainer.appendChild(pronunciationBtn);
    buttonContainer.appendChild(toggleButton);
    buttonContainer.appendChild(statusButton);
    
    // 添加重点标记
    if (importantWords.has(word.word)) {
        const importantTag = document.createElement('span');
        importantTag.className = 'word-tag important-tag';
        importantTag.style.padding = '2px 8px';
        importantTag.style.fontSize = '12px';
        importantTag.textContent = '重点';
        buttonContainer.appendChild(importantTag);
    }
    
    return buttonContainer;
}

// 获取单词音标
async function getPhonetic(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();
        if (data && data[0] && data[0].phonetic) {
            return data[0].phonetic;
        }
        return '';
    } catch (error) {
        console.error('获取音标失败：', error);
        return '';
    }
}

// 更新单词计数显示
function updateWordCounter() {
    const totalWords = reviewRounds[currentRound].length;
    document.getElementById('currentWordNumber').textContent = currentWordIndex + 1;
    document.getElementById('totalWords').textContent = totalWords;
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('请选择文件！');
        return;
    }
    console.log('选择的文件：', file.name);

    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            let newWords = [];
            if (file.name.endsWith('.csv')) {
                // CSV文件处理
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) {
                    text = text.slice(1);
                }
                
                const rows = text.split('\n');
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i].trim();
                    if (row) {
                        const columns = row.split(',');
                        if (columns.length >= 2) {
                            const word = columns[0].trim();
                            const phonetic = columns.length >= 3 ? columns[1].trim() : await getPhonetic(word);
                            const meaning = columns.length >= 3 ? columns[2].trim() : columns[1].trim();
                            
                            if (isValidChinese(meaning)) {
                                newWords.push({
                                    word: word,
                                    phonetic: phonetic,
                                    meaning: meaning,
                                    mastered: false,
                                    attempts: 0
                                });
                            } else {
                                const convertedMeaning = decodeGBK(meaning);
                                if (isValidChinese(convertedMeaning)) {
                                    newWords.push({
                                        word: word,
                                        phonetic: phonetic,
                                        meaning: convertedMeaning,
                                        mastered: false,
                                        attempts: 0
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                // Excel文件处理
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                for (const row of jsonData) {
                    const word = row['单词'];
                    const phonetic = row['音标'] || await getPhonetic(word);
                    newWords.push({
                        word: word,
                        phonetic: phonetic,
                        meaning: row['含义'],
                        mastered: false,
                        attempts: 0
                    });
                }
            }

            if (newWords.length === 0) {
                throw new Error('没有找到有效的单词数据！');
            }

            if (isAppendMode && allWords.length > 0) {
                // 追加模式：检查重复单词
                const existingWords = new Set(allWords.map(w => w.word));
                const duplicates = newWords.filter(w => existingWords.has(w.word));
                
                if (duplicates.length > 0) {
                    const confirmMsg = `发现${duplicates.length}个重复单词，是否仍要添加？\n${
                        duplicates.map(w => w.word).join(', ')
                    }`;
                    if (!confirm(confirmMsg)) {
                        return;
                    }
                }
                
                // 追加新单词
                allWords = [...allWords, ...newWords];
                alert(`成功追加 ${newWords.length} 个单词！`);
            } else {
                // 替换模式
                allWords = newWords;
                alert(`成功导入 ${newWords.length} 个单词！`);
            }

            // 更新第一轮
            reviewRounds[0] = [...allWords];
            
            // 更新界面
            updateWordList();
            updateRoundButtons();
            updateProgress();
            saveUserData();

            // 开始复习
            startReview(1);
        } catch (error) {
            console.error('处理文件时出错：', error);
            alert('处理文件时出错：' + error.message);
        }
    };

    try {
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file, 'GB18030');
        } else {
            reader.readAsArrayBuffer(file);
        }
    } catch (error) {
        console.error('读取文件时出错：', error);
        alert('读取文件时出错！');
    }
}

// 检查是否是有效的中文字符
function isValidChinese(str) {
    return /^[\u4e00-\u9fa5，。？！、；：""''（）【】《》]+$/.test(str);
}

// GBK编码转换函数
function decodeGBK(str) {
    try {
        // 这里使用一个简单的映射来处理常见的乱码情况
        const gbkMap = {
            'ƻ': '苹果',
            '㽶': '香蕉',
            // 可以根据需要添加更多的映射
        };
        return gbkMap[str] || str;
    } catch (error) {
        console.error('编码转换失败：', error);
        return str;
    }
}

// 开始复习
function startReview(round) {
    console.log('开始第', round, '轮复习');
    currentRound = round - 1;
    currentWordIndex = 0;

    console.log('当前轮次：', currentRound);
    console.log('当前轮次单词：', reviewRounds[currentRound]);

    if (!reviewRounds[currentRound] || reviewRounds[currentRound].length === 0) {
        if (currentRound === 0) {
            // 检查是否是从第9轮循环回来的
            const ninthRound = reviewRounds[8];
            if (ninthRound && ninthRound.length > 0) {
                const unmasteredWords = ninthRound.filter(word => !word.mastered);
                if (unmasteredWords.length > 0) {
                    reviewRounds[0] = unmasteredWords;
                    alert(`第9轮有${unmasteredWords.length}个单词未掌握，将继续学习这些单词。`);
                } else {
                    alert('请先导入单词！');
                    return;
                }
            } else {
                alert('请先导入单词！');
                return;
            }
        } else {
            // 获取上一轮未掌握的单词
            const previousRound = reviewRounds[currentRound - 1];
            if (!previousRound || previousRound.length === 0) {
                alert('没有上一轮的单词记录！');
                return;
            }
            reviewRounds[currentRound] = previousRound.filter(word => !word.mastered);
        }
    }

    if (reviewRounds[currentRound].length === 0) {
        if (currentRound === 8) {
            // 如果是第9轮结束，检查是否所有单词都已掌握
            const allMastered = reviewRounds.every(round => 
                !round || round.every(word => word.mastered)
            );
            if (allMastered) {
                alert('恭喜！所有单词都已掌握！');
            } else {
                alert('本轮没有需要复习的单词！请返回第1轮继续学习未掌握的单词。');
                // 自动跳转到第1轮
                startReview(1);
            }
        } else {
            alert('本轮没有需要复习的单词！');
        }
        return;
    }

    // 在显示单词区域之前添加进度更新
    updateProgress();
    
    // 显示单词区域
    const wordSection = document.querySelector('.word-section');
    wordSection.style.display = 'block';
    
    // 确保计数器和单词都正确显示
    updateWordCounter();
    showCurrentWord();
}

// 显示当前单词
function showCurrentWord() {
    const currentWord = reviewRounds[currentRound][currentWordIndex];
    console.log('显示单词：', currentWord);

    if (!currentWord) {
        console.log('没有找到当前单词');
        alert('本轮复习完成！');
        document.querySelector('.word-section').style.display = 'none';
        updateProgress();
        return;
    }

    const wordText = document.getElementById('wordText');
    const phoneticText = document.getElementById('phoneticText');
    const meaningText = document.getElementById('meaningText');
    
    wordText.textContent = currentWord.word;
    phoneticText.textContent = currentWord.phonetic || '';
    meaningText.textContent = currentWord.meaning;
    meaningText.style.display = 'none';
    
    // 更新重点按钮状态
    const importantButton = document.querySelector('.important-button');
    importantButton.classList.toggle('active', importantWords.has(currentWord.word));
    
    // 更新上一个按钮状态
    const previousButton = document.querySelector('button[onclick="previousWord()"]');
    if (previousButton) {
        previousButton.disabled = currentWordIndex === 0;
        previousButton.style.opacity = currentWordIndex === 0 ? '0.5' : '1';
    }
    
    // 自动播放发音
    speakWithDifferentVoice(currentWord.word);
    
    console.log('单词显示更新完成');
    updateWordCounter();
    updateProgress();
}

// 显示单词含义
function showMeaning() {
    document.getElementById('meaningText').style.display = 'block';
}

// 标记为已掌握
function markAsKnown() {
    const currentWord = reviewRounds[currentRound][currentWordIndex];
    if (!currentWord) return;
    
    currentWord.mastered = true;
    currentWord.attempts++;
    
    // 更新所有轮次中这个单词的状态
    for (let round of reviewRounds) {
        const wordInRound = round.find(w => w.word === currentWord.word);
        if (wordInRound) {
            wordInRound.mastered = true;
        }
    }
    
    // 更新主单词列表中的状态
    const mainWordIndex = allWords.findIndex(w => w.word === currentWord.word);
    if (mainWordIndex !== -1) {
        allWords[mainWordIndex].mastered = true;
        allWords[mainWordIndex].attempts = currentWord.attempts;
    }
    
    // 更新界面和保存数据
    updateWordList();
    updateRoundButtons();
    updateProgress();
    saveUserData();
    
    nextWord();
}

// 标记为未掌握
function markAsUnknown() {
    const currentWord = reviewRounds[currentRound][currentWordIndex];
    if (!currentWord) return;
    
    currentWord.mastered = false;
    currentWord.attempts++;
    
    // 更新所有轮次中这个单词的状态
    for (let round of reviewRounds) {
        const wordInRound = round.find(w => w.word === currentWord.word);
        if (wordInRound) {
            wordInRound.mastered = false;
        }
    }
    
    // 更新主单词列表中的状态
    const mainWordIndex = allWords.findIndex(w => w.word === currentWord.word);
    if (mainWordIndex !== -1) {
        allWords[mainWordIndex].mastered = false;
        allWords[mainWordIndex].attempts = currentWord.attempts;
    }
    
    // 更新界面和保存数据
    updateWordList();
    updateRoundButtons();
    updateProgress();
    saveUserData();
    
    nextWord();
}

// 下一个单词
function nextWord() {
    currentWordIndex++;
    if (currentWordIndex >= reviewRounds[currentRound].length) {
        const unmasteredCount = reviewRounds[currentRound].filter(word => !word.mastered).length;
        if (currentRound === 8 && unmasteredCount > 0) {
            alert(`本轮复习完成！还有${unmasteredCount}个单词未掌握，将返回第1轮继续学习。`);
            document.querySelector('.word-section').style.display = 'none';
            updateProgress();
            setTimeout(() => startReview(1), 1500);
        } else {
            alert('本轮复习完成！');
            document.querySelector('.word-section').style.display = 'none';
            updateProgress();
        }
        return;
    }
    showCurrentWord();
}

// 更新轮次按钮显示
function updateRoundButtons() {
    for (let round = 1; round <= 9; round++) {
        const button = document.querySelector(`button[onclick="startReview(${round})"]`);
        const currentRoundWords = reviewRounds[round - 1];
        const previousRoundWords = round > 1 ? reviewRounds[round - 2] : null;
        
        if (previousRoundWords) {
            const unmasteredCount = previousRoundWords.filter(word => !word.mastered).length;
            if (unmasteredCount > 0) {
                button.innerHTML = `第${round}轮 <span class="unmastered-count">(${unmasteredCount})</span>`;
            } else {
                button.innerHTML = `第${round}轮`;
            }
        } else {
            // 第一轮显示总单词数
            if (round === 1 && currentRoundWords) {
                const totalCount = currentRoundWords.length;
                button.innerHTML = `第1轮 <span class="unmastered-count">(${totalCount})</span>`;
            }
        }
    }
}

// 检查是否已登录
function checkLogin() {
    const isAuthorized = localStorage.getItem('isAuthorized');
    const authCode = localStorage.getItem('authCode');
    
    if (isAuthorized === 'true' && authCode) {
        // 如果是永久授权码，直接通过
        if (authCode === 'SUNNY888888') {
            showMainContent();
            loadUserData();
            updateExpirationInfo();
            return;
        }
        
        // 否则检查是否过期
        if (isExpired()) {
            // 清除过期的授权信息
            localStorage.removeItem('isAuthorized');
            localStorage.removeItem('authCode');
            localStorage.removeItem('expirationDate');
            return;
        }
        
        showMainContent();
        loadUserData();
        updateExpirationInfo();
    }
}

// 登录函数
function login() {
    const authCode = document.getElementById('authCode').value.trim();
    
    if (!authCode) {
        alert('请输入授权码！');
        return;
    }

    // 检查授权码是否有效
    if (!AUTH_CODES.has(authCode)) {
        alert('授权码错误！');
        document.getElementById('authCode').value = '';
        return;
    }

    // 检查是否是永久授权码
    if (authCode !== 'SUNNY888888') {
        // 检查是否过期（只对非永久授权码检查）
        if (isExpired()) {
            alert('当前授权码已过期，请联系管理员获取新的授权码！');
            document.getElementById('authCode').value = '';
            return;
        }
    }

    // 保存授权状态和使用的授权码
    localStorage.setItem('isAuthorized', 'true');
    localStorage.setItem('authCode', authCode);
    if (authCode !== 'SUNNY888888') {
        localStorage.setItem('expirationDate', EXPIRATION_DATE.toISOString());
    }

    showMainContent();
    loadUserData();
    updateExpirationInfo();
}

// 显示主要内容
function showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'flex';
}

// 退出登录
function logout() {
    // 先保存数据
    saveUserData();
    
    // 清除授权信息
    localStorage.removeItem('isAuthorized');
    localStorage.removeItem('authCode');
    localStorage.removeItem('expirationDate');
    
    // 重置数据
    allWords = [];
    reviewRounds = Array(9).fill().map(() => []);
    currentRound = 0;
    currentWordIndex = 0;
    importantWords.clear();
    
    // 直接修改 DOM 显示状态
    const mainContainer = document.getElementById('mainContainer');
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    
    if (mainContainer) mainContainer.style.display = 'none';
    if (loginSection) loginSection.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    
    // 清空授权码输入框
    const authCodeInput = document.getElementById('authCode');
    if (authCodeInput) authCodeInput.value = '';
    
    // 重置其他UI元素
    const wordList = document.getElementById('wordList');
    const wordSection = document.querySelector('.word-section');
    
    if (wordList) wordList.innerHTML = '';
    if (wordSection) wordSection.style.display = 'none';
    
    // 更新进度显示
    updateProgress();
}

// 保存用户数据
function saveUserData() {
    const userData = {
        allWords,
        reviewRounds,
        currentRound,
        currentWordIndex,
        importantWords: Array.from(importantWords),
        lastSaved: new Date().toISOString()
    };
    
    // 保存到 localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    console.log('数据已保存 -', new Date().toLocaleString());
}

// 加载用户数据
function loadUserData() {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        try {
            const userData = JSON.parse(savedData);
            allWords = userData.allWords || [];
            reviewRounds = userData.reviewRounds || Array(9).fill().map(() => []);
            currentRound = userData.currentRound || 0;
            currentWordIndex = userData.currentWordIndex || 0;
            importantWords = new Set(userData.importantWords || []);
            
            // 加载追加模式状态
            isAppendMode = localStorage.getItem('appendMode') === 'true';
            const statusSpan = document.getElementById('appendModeStatus');
            const appendButton = document.querySelector('.append-button');
            if (statusSpan && appendButton) {
                statusSpan.textContent = isAppendMode ? '开启' : '关闭';
                appendButton.classList.toggle('active', isAppendMode);
            }
            
            // 更新界面
            updateWordList();
            updateRoundButtons();
            updateProgress();
            
            if (allWords.length > 0 && userData.lastSaved) {
                const lastSaved = new Date(userData.lastSaved);
                const timeAgo = Math.round((new Date() - lastSaved) / 1000 / 60);
                console.log(`已加载${timeAgo}分钟前的学习进度`);
            }
        } catch (error) {
            console.error('加载数据出错：', error);
            alert('加载数据出错，将重新开始');
        }
    }
}

// 增加自动保存的频率（每30秒）
setInterval(saveUserData, 30000);

// 页面加载完成后检查登录状态
window.addEventListener('load', function() {
    initVoices();
    checkLogin();
});

// 更新进度的函数
function updateProgress() {
    if (allWords.length === 0) {
        document.getElementById('totalWordsCount').textContent = '0';
        document.getElementById('masteredCount').textContent = '0';
        document.getElementById('unmasteredCount').textContent = '0';
        document.getElementById('importantWordsCount').textContent = '0';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        return;
    }

    const totalWords = allWords.length;
    const masteredWords = allWords.filter(word => word.mastered).length;
    const unmasteredWords = totalWords - masteredWords;
    const importantWordsCount = importantWords.size;
    const progressPercentage = Math.round((masteredWords / totalWords) * 100);

    // 更新统计数字
    document.getElementById('totalWordsCount').textContent = totalWords;
    document.getElementById('masteredCount').textContent = masteredWords;
    document.getElementById('unmasteredCount').textContent = unmasteredWords;
    document.getElementById('importantWordsCount').textContent = importantWordsCount;

    // 更新进度条
    document.getElementById('progressBar').style.width = `${progressPercentage}%`;
    document.getElementById('progressText').textContent = `${progressPercentage}%`;

    // 根据进度改变进度条颜色
    const progressBar = document.getElementById('progressBar');
    if (progressPercentage < 30) {
        progressBar.style.background = 'linear-gradient(45deg, #ff5722, #f4511e)';
    } else if (progressPercentage < 70) {
        progressBar.style.background = 'linear-gradient(45deg, #ff9800, #fb8c00)';
    } else {
        progressBar.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
    }
}

// 切换显示模式
function toggleDisplayMode() {
    showEnglish = !showEnglish;
    const toggleButton = document.getElementById('toggleDisplayMode');
    toggleButton.textContent = showEnglish ? '显示中文' : '显示英文';
    updateWordList();
}

// 切换单词的重点状态
function toggleImportant() {
    const currentWord = reviewRounds[currentRound][currentWordIndex];
    if (!currentWord) return;

    const wordKey = currentWord.word;
    if (importantWords.has(wordKey)) {
        importantWords.delete(wordKey);
    } else {
        importantWords.add(wordKey);
    }

    // 更新按钮状态
    const importantButton = document.querySelector('.important-button');
    importantButton.classList.toggle('active', importantWords.has(wordKey));

    // 更新界面和保存数据
    updateImportantWordList();
    updateProgress();
    saveUserData();
}

// 更新重点单词列表显示
function updateImportantWordList() {
    const importantWordListDiv = document.getElementById('importantWordList');
    importantWordListDiv.innerHTML = '';
    
    const importantWordArray = allWords.filter(word => importantWords.has(word.word));
    
    importantWordArray.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-list-item';
        
        const contentContainer = document.createElement('div');
        contentContainer.style.flex = '1';
        
        const english = document.createElement('span');
        english.className = 'word-english';
        english.textContent = word.word;
        
        const phonetic = document.createElement('span');
        phonetic.className = 'word-phonetic';
        phonetic.textContent = word.phonetic || '';
        
        const chinese = document.createElement('span');
        chinese.className = 'word-chinese';
        chinese.textContent = word.meaning;
        
        const pronunciationBtn = document.createElement('button');
        pronunciationBtn.className = 'pronunciation-button';
        pronunciationBtn.innerHTML = '🔊 发音';
        pronunciationBtn.onclick = () => speakWithDifferentVoice(word.word);
        
        const removeContainer = document.createElement('div');
        removeContainer.style.marginLeft = 'auto';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'control-button';
        removeBtn.style.backgroundColor = '#f44336';
        removeBtn.style.padding = '5px 10px';
        removeBtn.innerHTML = '移除';
        removeBtn.onclick = () => {
            importantWords.delete(word.word);
            // 更新所有相关显示
            updateImportantWordList();
            updateWordList();
            updateProgress();
            saveUserData();
            
            // 查找并更新主列表中对应单词的红点
            const wordListItems = document.querySelectorAll('.word-list-item');
            wordListItems.forEach(item => {
                const englishSpan = item.querySelector('.word-english');
                if (englishSpan && englishSpan.textContent === word.word) {
                    const dot = item.querySelector('span[style*="border-radius: 50%"]');
                    if (dot) {
                        dot.style.backgroundColor = 'transparent';
                    }
                }
            });
        };
        
        const topLine = document.createElement('div');
        topLine.style.display = 'flex';
        topLine.style.alignItems = 'center';
        topLine.appendChild(english);
        topLine.appendChild(phonetic);
        topLine.appendChild(pronunciationBtn);
        contentContainer.appendChild(topLine);
        contentContainer.appendChild(chinese);
        
        removeContainer.appendChild(removeBtn);
        
        const flexContainer = document.createElement('div');
        flexContainer.style.display = 'flex';
        flexContainer.style.alignItems = 'center';
        flexContainer.style.gap = '10px';
        
        flexContainer.appendChild(contentContainer);
        flexContainer.appendChild(removeContainer);
        
        wordItem.appendChild(flexContainer);
        importantWordListDiv.appendChild(wordItem);
    });
    
    const importantCount = document.getElementById('importantCount');
    importantCount.textContent = `(${importantWords.size})`;
}

// 开始重点单词复习
function startImportantReview() {
    const importantWordArray = allWords.filter(word => importantWords.has(word.word));
    
    if (importantWordArray.length === 0) {
        alert('没有重点单词！');
        return;
    }
    
    // 重置所有轮次
    reviewRounds = Array(9).fill().map(() => []);
    // 设置第一轮为重点单词
    reviewRounds[0] = importantWordArray.map(word => ({...word, mastered: false, attempts: 0}));
    
    currentRound = 0;
    currentWordIndex = 0;
    
    // 更新界面
    updateRoundButtons();
    
    // 开始复习
    startReview(1);
}

// 切换追加模式
function toggleAppendMode() {
    isAppendMode = !isAppendMode;
    const statusSpan = document.getElementById('appendModeStatus');
    const appendButton = document.querySelector('.append-button');
    
    statusSpan.textContent = isAppendMode ? '开启' : '关闭';
    appendButton.classList.toggle('active', isAppendMode);
    
    // 保存追加模式状态
    if (currentUser) {
        localStorage.setItem(`appendMode_${currentUser}`, isAppendMode);
    }
}

// 清空所有单词
function clearAllWords() {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    if (allWords.length === 0) {
        alert('当前没有单词可清空！');
        return;
    }

    if (confirm('确定要清空所有单词吗？此操作不可恢复！')) {
        // 清空所有数据
        allWords = [];
        reviewRounds = Array(9).fill().map(() => []);
        currentRound = 0;
        currentWordIndex = 0;
        importantWords.clear();

        // 更新界面
        updateWordList();
        updateRoundButtons();
        updateProgress();
        document.querySelector('.word-section').style.display = 'none';

        // 保存更改
        saveUserData();
        alert('所有单词已清空！');
    }
}

// 添加导出功能
function exportWordList(type) {
    let words = [];
    let title = '';
    
    if (type === 'important') {
        words = allWords.filter(word => importantWords.has(word.word));
        title = '重点单词列表';
    } else if (type === 'unmastered') {
        words = allWords.filter(word => !word.mastered);
        title = '未掌握单词列表';
    }
    
    if (words.length === 0) {
        alert(`没有${type === 'important' ? '重点' : '未掌握'}单词！`);
        return;
    }
    
    // 创建打印窗口的内容
    const printContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    text-align: center;
                    color: #333;
                    margin-bottom: 20px;
                }
                .word-item {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: center;
                }
                .word-item:last-child {
                    border-bottom: none;
                }
                .word-english {
                    font-weight: bold;
                    min-width: 150px;
                }
                .word-phonetic {
                    color: #666;
                    min-width: 120px;
                    margin: 0 20px;
                }
                .word-chinese {
                    color: #333;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .word-item {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${words.map((word, index) => `
                <div class="word-item">
                    <span class="word-english">${word.word}</span>
                    <span class="word-phonetic">${word.phonetic || ''}</span>
                    <span class="word-chinese">${word.meaning}</span>
                </div>
            `).join('')}
        </body>
        </html>
    `;
    
    // 创建新窗口并打印
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // 等待图片加载完成后打印
    setTimeout(() => {
        printWindow.print();
        // 打印完成后关闭窗口
        printWindow.onafterprint = function() {
            printWindow.close();
        };
    }, 500);
}

// 添加上一个单词的函数
function previousWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        showCurrentWord();
    } else {
        alert('已经是本轮第一个单词了！');
    }
}

// 添加页面关闭时的保存功能
window.addEventListener('beforeunload', function(e) {
    saveUserData();
});

// 添加更新到期时间显示的函数
function updateExpirationInfo() {
    const expirationInfo = document.getElementById('expirationInfo');
    const authCode = localStorage.getItem('authCode');
    
    if (authCode === 'SUNNY888888') {
        expirationInfo.textContent = '永久授权';
        return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expirationDay = new Date(EXPIRATION_DATE.getFullYear(), EXPIRATION_DATE.getMonth(), EXPIRATION_DATE.getDate());
    const daysLeft = Math.ceil((expirationDay - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
        expirationInfo.textContent = `授权剩余 ${daysLeft} 天`;
    } else {
        expirationInfo.textContent = '授权已过期';
        setTimeout(() => {
            alert('授权已过期，请联系管理员获取新的授权码！');
            logout();
        }, 1000);
    }
}

// 添加定时更新到期时间显示
setInterval(updateExpirationInfo, 60000); // 每分钟更新一次 