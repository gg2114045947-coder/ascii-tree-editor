// 使用IIFE创建一个独立的作用域
(function() {
    'use strict';

    // --- 数据模型 ---
    let nodeIdCounter = 0;
    class Node {
        constructor(text, parent = null) {
            this.id = nodeIdCounter++;
            this.text = text;
            this.parent = parent;
            this.children = [];
        }
    }

    // --- 应用状态 (State) ---
    const state = {
        root: new Node('根节点'),
        selectedNode: null,
    };
    state.selectedNode = state.root;

    // --- DOM 元素缓存 ---
    const dom = {
        interactiveTree: document.getElementById('interactive-tree'),
        asciiOutput: document.getElementById('ascii-output'),
        nodeText: document.getElementById('node-text'),
        btnAddChild: document.getElementById('btn-add-child'),
        btnAddSibling: document.getElementById('btn-add-sibling'),
        btnEdit: document.getElementById('btn-edit'),
        btnDelete: document.getElementById('btn-delete'),
        btnCopy: document.getElementById('copy-button'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeModalButtons: document.querySelectorAll('.modal__close-button, .modal__close-footer-btn'),
    };

    // --- 渲染模块 (View) ---
    // 职责：只根据当前 state 来渲染UI，不包含任何业务逻辑
    const view = {
        render() {
            this.renderInteractiveTree();
            this.renderAsciiTree();
            this.updateButtonStates();
        },

        renderInteractiveTree() {
            dom.interactiveTree.innerHTML = '';
            const rootUl = document.createElement('ul');
            rootUl.appendChild(this.createInteractiveNodeElement(state.root));
            dom.interactiveTree.appendChild(rootUl);
        },

        createInteractiveNodeElement(node) {
            const li = document.createElement('li');
            const span = document.createElement('span');
            
            li.className = 'interactive-tree__node';
            span.className = 'interactive-tree__text';
            
            li.dataset.id = node.id;
            span.textContent = node.text;

            if (state.selectedNode && node.id === state.selectedNode.id) {
                li.classList.add('is-selected');
                dom.nodeText.value = node.text;
            }

            li.appendChild(span);

            if (node.children.length > 0) {
                const ul = document.createElement('ul');
                node.children.forEach(child => ul.appendChild(this.createInteractiveNodeElement(child)));
                li.appendChild(ul);
            }
            return li;
        },

        renderAsciiTree() {
            const lines = [];
            this.generateAscii(state.root, '', true, lines);
            dom.asciiOutput.value = lines.join('\n');
        },

        generateAscii(node, prefix, isLast, lines) {
            const currentPrefix = prefix + (isLast ? '┗━━ ' : '┣━━ ');
            lines.push(node.parent === null ? node.text : currentPrefix + node.text);
            
            node.children.forEach((child, index, arr) => {
                const newPrefix = prefix + (isLast ? '    ' : '┃   ');
                this.generateAscii(child, newPrefix, index === arr.length - 1, lines);
            });
        },

        updateButtonStates() {
            const isRootSelected = state.selectedNode === state.root;
            dom.btnAddSibling.disabled = isRootSelected;
            dom.btnDelete.disabled = isRootSelected;
            dom.btnEdit.disabled = !state.selectedNode;
            dom.btnAddChild.disabled = !state.selectedNode;
        },

        toggleModal(show) {
            if (show) {
                dom.settingsModal.hidden = false;
                dom.settingsModal.classList.add('is-open');
            } else {
                dom.settingsModal.classList.remove('is-open');
                // 监听动画结束事件，结束后再隐藏，优化体验
                dom.settingsModal.addEventListener('animationend', () => {
                    dom.settingsModal.hidden = true;
                }, { once: true });
            }
        },
    };
    
    // --- 操作模块 (Actions) ---
    // 职责：只修改 state，不直接接触 DOM
    const actions = {
        findNodeById(node, id) {
            if (node.id === id) return node;
            for (const child of node.children) {
                const found = this.findNodeById(child, id);
                if (found) return found;
            }
            return null;
        },

        selectNode(nodeId) {
            const newSelectedNode = this.findNodeById(state.root, nodeId);
            if (newSelectedNode) {
                state.selectedNode = newSelectedNode;
            }
        },

        addChild(text) {
            if (!text || !state.selectedNode) return false;
            const newNode = new Node(text, state.selectedNode);
            state.selectedNode.children.push(newNode);
            return true;
        },

        addSibling(text) {
            if (!text || !state.selectedNode || state.selectedNode === state.root) return false;
            const parent = state.selectedNode.parent;
            const newNode = new Node(text, parent);
            const index = parent.children.indexOf(state.selectedNode);
            parent.children.splice(index + 1, 0, newNode);
            return true;
        },

        editNode(text) {
            if (!text || !state.selectedNode) return false;
            state.selectedNode.text = text;
            return true;
        },

        deleteNode() {
            if (!state.selectedNode || state.selectedNode === state.root) return false;
            const parent = state.selectedNode.parent;
            parent.children.splice(parent.children.indexOf(state.selectedNode), 1);
            state.selectedNode = parent;
            return true;
        },
    };

    // --- 控制器/事件绑定 (Controller / Event Listeners) ---
    // 职责：连接用户输入和应用逻辑，调用 actions 和 view
    function bindEvents() {
        dom.interactiveTree.addEventListener('click', (e) => {
            const li = e.target.closest('.interactive-tree__node');
            if (li && li.dataset.id) {
                actions.selectNode(parseInt(li.dataset.id, 10));
                view.render();
            }
        });

        dom.btnAddChild.addEventListener('click', () => {
            const text = dom.nodeText.value.trim();
            if (actions.addChild(text)) {
                dom.nodeText.value = '';
                dom.nodeText.focus();
                view.render();
            }
        });

        dom.btnAddSibling.addEventListener('click', () => {
            const text = dom.nodeText.value.trim();
            if (actions.addSibling(text)) {
                dom.nodeText.value = '';
                dom.nodeText.focus();
                view.render();
            }
        });

        dom.btnEdit.addEventListener('click', () => {
            const text = dom.nodeText.value.trim();
            if (actions.editNode(text)) {
                view.render();
            }
        });

        dom.btnDelete.addEventListener('click', () => {
            if (actions.deleteNode()) {
                view.render();
            }
        });
        
        dom.nodeText.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                dom.btnAddChild.click(); // 触发添加子节点按钮的点击事件
            }
        });

        dom.btnCopy.addEventListener('click', async () => {
            if (!navigator.clipboard) {
                alert('您的浏览器不支持现代剪贴板API，请手动复制。');
                return;
            }
            try {
                await navigator.clipboard.writeText(dom.asciiOutput.value);
                const originalText = dom.btnCopy.textContent;
                dom.btnCopy.textContent = '已复制!';
                dom.btnCopy.disabled = true;
                setTimeout(() => {
                    dom.btnCopy.textContent = originalText;
                    dom.btnCopy.disabled = false;
                }, 1500);
            } catch (err) {
                console.error('复制失败: ', err);
                alert('复制失败，请检查浏览器权限或手动复制。');
            }
        });

        // --- Modal Events ---
        dom.settingsBtn.addEventListener('click', () => view.toggleModal(true));
        
        dom.closeModalButtons.forEach(button => {
            button.addEventListener('click', () => view.toggleModal(false));
        });
        
        dom.settingsModal.addEventListener('click', (e) => {
            if (e.target === dom.settingsModal) {
                view.toggleModal(false);
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.settingsModal.classList.contains('is-open')) {
                view.toggleModal(false);
            }
        });
    }

    // --- 应用初始化 ---
    function init() {
        bindEvents();
        view.render(); // 首次渲染
    }
    
    document.addEventListener('DOMContentLoaded', init);

})();