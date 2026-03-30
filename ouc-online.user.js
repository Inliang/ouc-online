// ==UserScript==
// @name         国家开放大学学习助手
// @namespace    http://tampermonkey.net/
// @version      2.6.8
// @description  国家开放大学课程自动脚本，支持视频自动播放、讨论自动回复，可暂停，视频结束后等待2秒自动跳转。日志面板左右分栏，可拖拽、最小化。
// @author       You
// @match        https://lms.ouchn.cn/course/*full-screen*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/494453/%E5%9B%BD%E5%AE%B6%E5%BC%80%E6%94%BE%E5%A4%A7%E5%AD%A6.user.js
// @updateURL    https://update.greasyfork.org/scripts/494453/%E5%9B%BD%E5%AE%B6%E5%BC%80%E6%94%BE%E5%A4%A7%E5%AD%A6.meta.js
// ==/UserScript==

// 用户配置（可按需修改）
const USER_CONFIG = {
    videoSpeed: 2.0,          // 播放速度（推荐1.0~2.0，1.5较流畅）
    autoNextDelay: 2000       // 视频结束后等待跳转的毫秒数
};

const CSS_STYLES = `
.ouchn-logger {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    height: 400px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(12px);
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    color: #fff;
    font-family: 'Microsoft YaHei', sans-serif;
    z-index: 99999;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.25);
    display: flex;
    flex-direction: column;
    resize: none;
}

.logger-header {
    padding: 10px 12px;
    background: rgba(43,50,178,0.85);
    cursor: move;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    user-select: none;
}

.logger-title {
    font-weight: bold;
    color: #ffffff;
    font-size: 13px;
}

.logger-controls {
    display: flex;
    gap: 8px;
}

.logger-btn {
    cursor: pointer;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    background: rgba(255,255,255,0.2);
    transition: all 0.3s;
}

.logger-btn:hover {
    background: rgba(255,255,255,0.35);
    transform: scale(1.1);
}

/* 左右分栏布局 */
.logger-main {
    display: flex;
    flex: 1;
    min-height: 0;
}

/* 左侧功能面板 */
.logger-left {
    width: 100px;
    background: rgba(0,0,0,0.5);
    border-right: 1px solid rgba(255,255,255,0.1);
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 12px;
}

/* 右侧日志面板 */
.logger-right {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #75d6ff rgba(0,0,0,0.2);
}

.logger-right::-webkit-scrollbar {
    width: 5px;
}

.logger-right::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #75d6ff, #2b32b2);
    border-radius: 3px;
}

.logger-right::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
}

/* 功能控件样式 */
.func-item {
    margin-bottom: 6px;
}

.func-label {
    font-size: 12px;
    color: #ddd;
    margin-bottom: 6px;
    display: block;
}

.speed-control {
    display: flex;
    gap: 5px;
    align-items: center;
}

.speed-value {
    font-size: 13px;
    font-weight: bold;
    color: #75d6ff;
    width: 32px;
    text-align: center;
}

.speed-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 4px;
    width: 26px;
    height: 26px;
    font-size: 12px;
    transition: all 0.2s;
}

.speed-btn:hover {
    background: rgba(255,255,255,0.35);
}

.status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #4CAF50;
    display: inline-block;
    margin-right: 6px;
    vertical-align: middle;
}

.status-indicator.paused {
    background: #FF9800;
    animation: pulse 2s infinite;
}

.pause-button {
    background: #FFC107;
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    margin-top: 8px;
    transition: all 0.2s;
}

.pause-button:hover {
    background: #FFD54F;
}

/* 日志条目样式 */
.log-entry {
    margin: 6px 0;
    padding: 8px 10px;
    background: rgba(255,255,255,0.1);
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.4;
    border-left: 3px solid #75d6ff;
    animation: fadeIn 0.3s ease-in;
}

.log-entry.success {
    border-left-color: #4CAF50;
}

.log-entry.warning {
    border-left-color: #FFC107;
}

.log-entry.error {
    border-left-color: #F44336;
}

.log-entry.paused {
    border-left-color: #FF9800;
    background: rgba(255,152,0,0.15);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateX(5px); }
    to { opacity: 1; transform: translateX(0); }
}

.log-time {
    color: #75d6ff;
    font-size: 11px;
    margin-right: 8px;
}

.log-message {
    color: rgba(255,255,255,0.95);
    word-break: break-word;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
`;

class OuchnLogger {
    constructor() {
        this.container = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.isPaused = false;
        this.pauseCallback = null;
        this.speed = USER_CONFIG.videoSpeed;
        this.init();
    }

    init() {
        const style = document.createElement('style');
        style.textContent = CSS_STYLES;
        document.head.appendChild(style);

        this.container = document.createElement('div');
        this.container.className = 'ouchn-logger';
        this.container.innerHTML = `
            <div class="logger-header">
                <span class="logger-title">📚 学习助手 v2.6.8</span>
                <div class="logger-controls">
                    <div class="logger-btn" title="最小化">−</div>
                    <div class="logger-btn" title="关闭">×</div>
                </div>
            </div>
            <div class="logger-main">
                <div class="logger-left">
                    <div class="func-item">
                        <span class="func-label">📊 状态</span>
                        <div><span class="status-indicator" id="statusIndicator"></span> <span id="statusText">运行中</span></div>
                    </div>
                    <div class="func-item">
                        <span class="func-label">⚡ 倍速</span>
                        <div class="speed-control">
                            <button class="speed-btn" data-speed="-0.5">-0.5</button>
                            <span class="speed-value" id="speedValue">${this.speed.toFixed(1)}</span>
                            <button class="speed-btn" data-speed="+0.5">+0.5</button>
                        </div>
                    </div>
                    <button class="pause-button" id="pauseButton">⏸️ 暂停</button>
                </div>
                <div class="logger-right" id="logContent"></div>
            </div>
        `;

        this.addEventListeners();
        document.body.appendChild(this.container);
    }

    addEventListeners() {
        const header = this.container.querySelector('.logger-header');
        const minimizeBtn = this.container.querySelector('.logger-btn:first-child');
        const closeBtn = this.container.querySelector('.logger-btn:last-child');
        const pauseButton = this.container.querySelector('#pauseButton');
        const speedBtns = this.container.querySelectorAll('.speed-btn');
        const speedValueSpan = this.container.querySelector('#speedValue');

        // 拖拽功能
        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            this.container.style.left = rect.left + 'px';
            this.container.style.top = rect.top + 'px';
            this.container.style.right = 'auto';
            this.container.style.bottom = 'auto';

            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.startLeft = rect.left;
            this.startTop = rect.top;
            document.body.style.userSelect = 'none';
        });

        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            this.container.style.left = `${this.startLeft + dx}px`;
            this.container.style.top = `${this.startTop + dy}px`;
        };

        const onMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                document.body.style.userSelect = '';
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 左侧暂停按钮
        pauseButton.addEventListener('click', () => {
            this.togglePause();
            if (this.pauseCallback) this.pauseCallback(this.isPaused);
        });

        // 速度调节
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                let delta = parseFloat(btn.dataset.speed);
                let newSpeed = this.speed + delta;
                newSpeed = Math.min(3.0, Math.max(0.5, newSpeed));
                this.speed = parseFloat(newSpeed.toFixed(1));
                speedValueSpan.innerText = this.speed.toFixed(1);
                USER_CONFIG.videoSpeed = this.speed;
                const video = document.querySelector('video');
                if (video && !video.paused) video.playbackRate = this.speed;
                this.log(`倍速已调至 ${this.speed} 倍`, 'info');
            });
        });

        // 最小化按钮
        minimizeBtn.addEventListener('click', () => {
            const main = this.container.querySelector('.logger-main');
            if (main.style.display === 'none') {
                main.style.display = 'flex';
                this.container.style.height = '400px';
                minimizeBtn.innerHTML = '−';
            } else {
                main.style.display = 'none';
                this.container.style.height = '36px';
                minimizeBtn.innerHTML = '+';
            }
        });

        // 关闭按钮
        closeBtn.addEventListener('click', () => {
            this.container.style.display = 'none';
        });

        this.updateUI();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.updateUI();
        this.log(this.isPaused ? '脚本已暂停' : '脚本已继续运行', this.isPaused ? 'paused' : 'success');
    }

    updateUI() {
        const statusIndicator = this.container.querySelector('#statusIndicator');
        const statusText = this.container.querySelector('#statusText');
        const pauseButton = this.container.querySelector('#pauseButton');

        if (this.isPaused) {
            statusIndicator.classList.add('paused');
            statusText.innerText = '已暂停';
            pauseButton.innerHTML = '▶️ 继续';
        } else {
            statusIndicator.classList.remove('paused');
            statusText.innerText = '运行中';
            pauseButton.innerHTML = '⏸️ 暂停';
        }
    }

    setPauseCallback(callback) {
        this.pauseCallback = callback;
    }

    isScriptPaused() {
        return this.isPaused;
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const now = new Date();
        const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
        entry.innerHTML = `<span class="log-time">${timeStr}</span><span class="log-message">${message}</span>`;
        const content = this.container.querySelector('#logContent');
        content.appendChild(entry);
        content.scrollTop = content.scrollHeight;
    }

    clear() {
        const content = this.container.querySelector('#logContent');
        content.innerHTML = '';
    }
}

const sleep = (timeout) => new Promise(resolve => setTimeout(resolve, timeout));

(function() {
    'use strict';
    let timer = null;
    const logger = new OuchnLogger();

    const removeOldLogger = () => {
        const oldLogger = document.getElementById('rec');
        if (oldLogger) oldLogger.remove();
    };

    logger.setPauseCallback((isPaused) => {
        if (isPaused) {
            clearInterval(timer);
            timer = null;
        } else if (!timer) {
            timer = setInterval(runMain, 6000);
        }
    });

    const nextLabel = () => {
        try {
            const nextBtn = document.querySelector('.next-btn.ivu-btn.ivu-btn-default');
            if (nextBtn) {
                nextBtn.click();
                logger.log('已跳转到下一节', 'success');
            } else {
                logger.log('未找到下一节按钮', 'warning');
            }
        } catch (e) {
            logger.log(`跳转失败: ${e.message}`, 'error');
        }
    };

    const handleDiscussion = async () => {
        if (logger.isScriptPaused()) {
            logger.log('脚本已暂停，跳过讨论处理', 'paused');
            return;
        }
        try {
            logger.log('检测到讨论页面，开始处理...', 'info');
            const topicList = document.querySelector('.forum-topic-list');
            if (!topicList) {
                logger.log('未找到讨论主题列表', 'warning');
                return;
            }
            let title = '学习讨论', content = '这是一个自动回复的讨论内容。';
            const titleElem = topicList.querySelector('.title');
            const contentElem = topicList.querySelector('.content');
            if (titleElem) title = titleElem.textContent.trim();
            if (contentElem) content = contentElem.textContent.trim();
            await sleep(1000);
            if (logger.isScriptPaused()) return;
            const postBtn = document.querySelector('.ivu-btn.ivu-btn-primary');
            if (postBtn) postBtn.click(), logger.log('点击发表帖子按钮', 'success');
            await sleep(2000);
            if (logger.isScriptPaused()) return;
            const titleInput = document.querySelector('.fields:first-child input');
            if (titleInput) {
                titleInput.value = title;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                logger.log('已填写讨论标题', 'success');
            }
            await sleep(1000);
            if (logger.isScriptPaused()) return;
            const contentEditor = document.querySelector('.ql-editor, [contenteditable="true"]');
            if (contentEditor) {
                contentEditor.textContent = content;
                contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
                logger.log('已填写讨论内容', 'success');
            }
            await sleep(1000);
            if (logger.isScriptPaused()) return;
            const submitBtn = document.querySelector('.button.button-green.medium');
            if (submitBtn) submitBtn.click(), logger.log('已提交讨论回复', 'success');
        } catch (e) {
            logger.log(`讨论处理失败: ${e.message}`, 'error');
        }
    };

    const handleVideo = async () => {
        if (logger.isScriptPaused()) {
            logger.log('脚本已暂停，跳过视频处理', 'paused');
            return;
        }
        try {
            logger.log('检测到视频页面，开始处理...', 'info');
            await sleep(2000);
            const videoList = document.getElementsByClassName('vjs-tech');
            if (videoList.length > 0) {
                logger.log('开始尝试播放视频', 'info');
                const video = videoList[0];
                video.muted = true;
                logger.log('视频已静音', 'success');
                const currentSpeed = USER_CONFIG.videoSpeed;
                video.playbackRate = currentSpeed;
                logger.log(`设置播放速度为 ${currentSpeed} 倍速`, 'success');
                await sleep(1000);
                if (logger.isScriptPaused()) return;
                const playButton = document.querySelector('.mvp-toggle-play.mvp-first-btn-margin');
                if (playButton) {
                    playButton.click();
                    logger.log('点击播放按钮', 'success');
                } else {
                    await video.play();
                    logger.log('自动开始播放', 'success');
                }
                await sleep(1000);
                if (logger.isScriptPaused()) return;
                video.playbackRate = currentSpeed;
                const timeAllVideo = video.duration;
                logger.log(`视频总时长: ${timeAllVideo.toFixed(1)}秒`, 'info');
                let checkPauseInterval = setInterval(() => {
                    if (logger.isScriptPaused()) return;
                    if (video.paused && !video.ended) {
                        logger.log('检测到视频暂停，尝试恢复播放', 'warning');
                        video.play();
                    }
                }, 90000);
                video.addEventListener('ended', async () => {
                    clearInterval(checkPauseInterval);
                    logger.log('视频播放完成，等待跳转', 'success');
                    await sleep(USER_CONFIG.autoNextDelay);
                    if (!logger.isScriptPaused()) nextLabel();
                    else logger.log('脚本已暂停，取消跳转', 'paused');
                }, { once: true });
            } else {
                logger.log('未找到视频元素', 'warning');
                nextLabel();
            }
        } catch (e) {
            logger.log(`视频处理失败: ${e.message}`, 'error');
            nextLabel();
        }
    };

    const runMain = async () => {
        if (logger.isScriptPaused()) return;
        clearInterval(timer);
        try {
            const activeItem = document.querySelector('.full-screen-mode-sidebar-menu-item.active');
            if (!activeItem) {
                logger.log('未找到当前活动菜单项', 'warning');
                return;
            }
            const classIcon = activeItem.querySelector('.font');
            if (!classIcon) {
                logger.log('未识别活动类型', 'warning');
                nextLabel();
                return;
            }
            const classSelect = classIcon.className;
            switch(classSelect) {
                case 'font activity-type-icon font-syllabus-page':
                    logger.log('普通页面，跳转下一节', 'info');
                    nextLabel();
                    break;
                case 'font activity-type-icon font-syllabus-forum':
                    await handleDiscussion();
                    await sleep(2000);
                    nextLabel();
                    break;
                case 'font activity-type-icon font-syllabus-online-video':
                    await handleVideo();
                    break;
                case 'font activity-type-icon font-syllabus-material':
                    logger.log('资料页面，查看附件', 'info');
                    const materialRow = document.querySelector('.ivu-table-row');
                    if (materialRow) {
                        const lastCell = materialRow.lastElementChild;
                        const viewBtn = lastCell?.querySelector('.ivu-btn');
                        if (viewBtn) viewBtn.click(), logger.log('已查看资料附件', 'success');
                    }
                    await sleep(2000);
                    const closeBtn = document.querySelector('.right.close');
                    if (closeBtn) closeBtn.click(), logger.log('已关闭资料窗口', 'success');
                    await sleep(2000);
                    nextLabel();
                    break;
                case 'font activity-type-icon font-syllabus-web-link':
                    logger.log('链接页面，打开外部链接', 'info');
                    const linkBtn = document.querySelector('.button.medium.button-green.open-link-button');
                    if (linkBtn) window.open(linkBtn.href, '_blank'), logger.log('已在新窗口打开链接', 'success');
                    await sleep(2000);
                    nextLabel();
                    break;
                case 'font activity-type-icon font-syllabus-exam':
                case 'font activity-type-icon font-syllabus-homework':
                    logger.log(`${classSelect.includes('exam') ? '考试' : '作业'}页面，跳过处理`, 'info');
                    await sleep(1000);
                    nextLabel();
                    break;
                default:
                    logger.log(`未知页面类型: ${classSelect}`, 'warning');
                    await sleep(1000);
                    nextLabel();
                    break;
            }
        } catch (e) {
            logger.log(`主流程异常: ${e.message}`, 'error');
        } finally {
            if (!logger.isScriptPaused()) timer = setInterval(runMain, 6000);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            removeOldLogger();
            logger.log('脚本初始化完成，开始监控学习进度', 'success');
            timer = setInterval(runMain, 3000);
        });
    } else {
        removeOldLogger();
        logger.log('脚本初始化完成，开始监控学习进度', 'success');
        timer = setInterval(runMain, 3000);
    }
})();
