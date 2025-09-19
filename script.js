(function() {
    // --- 数据模型 & 状态 ---
    let nodeIdCounter = 0;
    class Node {
        constructor(text, parent = null) {
            this.id = nodeIdCounter++;
            this.text = text;
            this.parent = parent;
            this.children = [];
        }
    }

    const state = {
        root: new Node('根节点'),
        selectedNode: null,
        contextMenuNode: null,
    };
    state.selectedNode = state.root;

    // --- 新增：应用配置对象 ---
    const config = {
        branchStyle: 'thick', // 可选值: 'thick', 'thin', 'double'
    };

    // --- DOM 元素缓存 ---
    const dom = {
        interactiveTree: document.getElementById('interactive-tree'),
        asciiOutput: document.getElementById('ascii-output'),
        btnCopy: document.getElementById('copy-button'),
        contextMenu: document.getElementById('context-menu'),
        pageSettingsBtn: document.getElementById('page-settings-btn'),
        // 新增模态框相关元素
        settingsModal: document.getElementById('settings-modal'),
        closeModalButtons: document.querySelectorAll('.close-button, .btn-close-footer'),
        branchStyleSelect: document.getElementById('branch-style-select'),
    };

    // --- 渲染模块 (UI Rendering) ---
    const ui = {
        render: function() {
            this.renderInteractiveTree();
            this.renderAsciiTree();
        },
        renderInteractiveTree: function() {
            // ... 此函数无变化
            dom.interactiveTree.innerHTML = '';
            const rootUl = document.createElement('ul');
            rootUl.appendChild(this.createInteractiveNodeElement(state.root));
            dom.interactiveTree.appendChild(rootUl);
        },
        createInteractiveNodeElement: function(node) {
            // ... 此函数无变化
            const li = document.createElement('li');
            const span = document.createElement('span');
            li.dataset.id = node.id;
            span.textContent = node.text;
            if (state.selectedNode && node.id === state.selectedNode.id) {
                li.classList.add('selected');
            }
            li.appendChild(span);
            if (node.children.length > 0) {
                const ul = document.createElement('ul');
                node.children.forEach(child => ul.appendChild(this.createInteractiveNodeElement(child)));
                li.appendChild(ul);
            }
            return li;
        },
        renderAsciiTree: function() {
            const lines = [];
            this.generateAscii(state.root, '', true, lines);
            dom.asciiOutput.value = lines.join('\n');
        },
        // --- 修改：generateAscii 函数现在会读取 config 配置 ---
        generateAscii: function(node, prefix, isLast, lines) {
            const styles = {
                thin:   { branch: '├── ', end: '└── ', pipe: '│   ', empty: '    ' },
                thick:  { branch: '┣━━ ', end: '┗━━ ', pipe: '┃   ', empty: '    ' },
                double: { branch: '╠══ ', end: '╚══ ', pipe: '║   ', empty: '    ' },
            };
            const style = styles[config.branchStyle] || styles.thick;

            const currentPrefix = prefix + (isLast ? style.end : style.branch);
            lines.push(node.parent === null ? node.text : currentPrefix + node.text);
            
            const childrenCount = node.children.length;
            if (childrenCount > 0) {
                const newPrefix = prefix + (isLast ? style.empty : style.pipe);
                node.children.forEach((child, index) => {
                    const isChildLast = index === childrenCount - 1;
                    this.generateAscii(child, newPrefix, isChildLast, lines);
                });
            }
        },
    };
    
    // --- 操作模块 (Actions & Logic) ---
    const actions = {
        // ... 此处保留所有旧的节点操作函数 ...
        findNodeById: (node, id) => { /* ... 无变化 ... */ if (node.id === id) return node; for (const child of node.children) { const found = actions.findNodeById(child, id); if (found) return found; } return null; },
        addChild: (parentNode) => { /* ... 无变化 ... */ const text = prompt("请输入新子节点的文本:", "新节点"); if (!text) return; const newNode = new Node(text, parentNode); parentNode.children.push(newNode); ui.render(); },
        addSibling: (siblingNode) => { /* ... 无变化 ... */ if (siblingNode === state.root) return; const text = prompt("请输入新同级节点的文本:", "新节点"); if (!text) return; const parent = siblingNode.parent; const newNode = new Node(text, parent); const index = parent.children.indexOf(siblingNode); parent.children.splice(index + 1, 0, newNode); ui.render(); },
        deleteNode: (nodeToDelete) => { /* ... 无变化 ... */ if (nodeToDelete === state.root) return; if (!confirm(`确定要删除节点 "${nodeToDelete.text}" 及其所有子节点吗？`)) return; const parent = nodeToDelete.parent; const index = parent.children.indexOf(nodeToDelete); parent.children.splice(index, 1); state.selectedNode = parent; ui.render(); },
        copyAscii: () => { /* ... 无变化 ... */ dom.asciiOutput.select(); document.execCommand('copy'); const originalText = dom.btnCopy.textContent; dom.btnCopy.textContent = '已复制!'; setTimeout(() => { dom.btnCopy.textContent = originalText; }, 1500); },
        
        // --- 新增：打开和关闭模态框的函数 ---
        openModal: function() {
            // 打开时，确保下拉框显示的是当前配置
            dom.branchStyleSelect.value = config.branchStyle;
            dom.settingsModal.classList.add('open');
        },
        closeModal: function() {
            dom.settingsModal.classList.remove('open');
        },
    };

    // --- 行内编辑逻辑 ---
    function handleDoubleClick(e) { /* ... 无变化 ... */ const span = e.target.closest('span'); if (!span) return; const li = span.parentElement; const nodeId = parseInt(li.dataset.id, 10); const nodeToEdit = actions.findNodeById(state.root, nodeId); const input = document.createElement('input'); input.type = 'text'; input.className = 'inline-edit-input'; input.value = nodeToEdit.text; li.replaceChild(input, span); input.focus(); input.select(); const saveEdit = () => { nodeToEdit.text = input.value.trim() || "未命名节点"; li.replaceChild(span, input); ui.render(); }; input.addEventListener('blur', saveEdit); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { li.replaceChild(span, input); input.removeEventListener('blur', saveEdit); } }); }

    // --- 右键菜单逻辑 ---
    function handleContextMenu(e) { /* ... 无变化 ... */ e.preventDefault(); const li = e.target.closest('li'); if (!li) return; const nodeId = parseInt(li.dataset.id, 10); state.contextMenuNode = actions.findNodeById(state.root, nodeId); dom.contextMenu.style.top = `${e.clientY}px`; dom.contextMenu.style.left = `${e.clientX}px`; const isRoot = state.contextMenuNode === state.root; dom.contextMenu.querySelector('[data-action="add-sibling"]').classList.toggle('disabled', isRoot); dom.contextMenu.querySelector('[data-action="delete"]').classList.toggle('disabled', isRoot); dom.contextMenu.style.display = 'block'; }
    
    // --- 事件绑定 (Event Listeners) ---
    function bindEvents() {
        // ... 保留所有旧的事件绑定 ...
        dom.interactiveTree.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && li.dataset.id) { state.selectedNode = actions.findNodeById(state.root, parseInt(li.dataset.id, 10)); ui.render(); } });
        dom.interactiveTree.addEventListener('dblclick', handleDoubleClick);
        dom.interactiveTree.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; });
        dom.contextMenu.addEventListener('click', (e) => { const target = e.target; if (target.tagName !== 'LI' || target.classList.contains('disabled')) return; const action = target.dataset.action; const node = state.contextMenuNode; switch (action) { case 'add-child': actions.addChild(node); break; case 'add-sibling': actions.addSibling(node); break; case 'delete': actions.deleteNode(node); break; } dom.contextMenu.style.display = 'none'; });
        dom.btnCopy.addEventListener('click', actions.copyAscii);

        // --- 新增：为模态框相关元素绑定事件 ---
        dom.pageSettingsBtn.addEventListener('click', actions.openModal);
        dom.closeModalButtons.forEach(button => button.addEventListener('click', actions.closeModal));
        dom.settingsModal.addEventListener('click', (e) => { if (e.target === dom.settingsModal) actions.closeModal(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dom.settingsModal.classList.contains('open')) actions.closeModal(); });

        // 当下拉菜单的值改变时，更新配置并重新渲染
        dom.branchStyleSelect.addEventListener('change', (e) => {
            config.branchStyle = e.target.value;
            ui.render(); // 实时更新ASCII树
        });
    }

    // --- 应用初始化 ---
    function init() {
        bindEvents();
        ui.render();
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();