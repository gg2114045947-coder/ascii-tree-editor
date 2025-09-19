(function() {
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
        contextMenuNode: null, // 记录右键点击的节点
    };
    state.selectedNode = state.root;

    // --- DOM 元素缓存 ---
    const dom = {
        interactiveTree: document.getElementById('interactive-tree'),
        asciiOutput: document.getElementById('ascii-output'),
        btnCopy: document.getElementById('copy-button'),
        contextMenu: document.getElementById('context-menu'),
    };

    // --- 渲染模块 (UI Rendering) ---
    const ui = {
        render: function() {
            this.renderInteractiveTree();
            this.renderAsciiTree();
        },
        renderInteractiveTree: function() {
            dom.interactiveTree.innerHTML = '';
            const rootUl = document.createElement('ul');
            rootUl.appendChild(this.createInteractiveNodeElement(state.root));
            dom.interactiveTree.appendChild(rootUl);
        },
        createInteractiveNodeElement: function(node) {
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
        generateAscii: function(node, prefix, isLast, lines) {
            const currentPrefix = prefix + (isLast ? '┗━━ ' : '┣━━ ');
            lines.push(node.parent === null ? node.text : currentPrefix + node.text);
            const childrenCount = node.children.length;
            if (childrenCount > 0) {
                const newPrefix = prefix + (isLast ? '    ' : '┃   ');
                node.children.forEach((child, index) => {
                    const isChildLast = index === childrenCount - 1;
                    this.generateAscii(child, newPrefix, isChildLast, lines);
                });
            }
        },
    };
    
    // --- 操作模块 (Actions & Logic) ---
    const actions = {
        findNodeById: function(node, id) {
            if (node.id === id) return node;
            for (const child of node.children) {
                const found = this.findNodeById(child, id);
                if (found) return found;
            }
            return null;
        },
        addChild: function(parentNode) {
            const text = prompt("请输入新子节点的文本:", "新节点");
            if (!text) return; // 用户取消输入
            const newNode = new Node(text, parentNode);
            parentNode.children.push(newNode);
            ui.render();
        },
        addSibling: function(siblingNode) {
            if (siblingNode === state.root) return;
            const text = prompt("请输入新同级节点的文本:", "新节点");
            if (!text) return; // 用户取消输入
            const parent = siblingNode.parent;
            const newNode = new Node(text, parent);
            const index = parent.children.indexOf(siblingNode);
            parent.children.splice(index + 1, 0, newNode);
            ui.render();
        },
        deleteNode: function(nodeToDelete) {
            if (nodeToDelete === state.root) return;
            if (!confirm(`确定要删除节点 "${nodeToDelete.text}" 及其所有子节点吗？`)) return;
            const parent = nodeToDelete.parent;
            const index = parent.children.indexOf(nodeToDelete);
            parent.children.splice(index, 1);
            state.selectedNode = parent; // 选中父节点
            ui.render();
        },
        copyAscii: function() {
            dom.asciiOutput.select();
            document.execCommand('copy');
            const originalText = dom.btnCopy.textContent;
            dom.btnCopy.textContent = '已复制!';
            setTimeout(() => { dom.btnCopy.textContent = originalText; }, 1500);
        },
    };

    // --- 新增：行内编辑逻辑 ---
    function handleDoubleClick(e) {
        const span = e.target.closest('span');
        if (!span) return;
        
        const li = span.parentElement;
        const nodeId = parseInt(li.dataset.id, 10);
        const nodeToEdit = actions.findNodeById(state.root, nodeId);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-edit-input';
        input.value = nodeToEdit.text;

        li.replaceChild(input, span);
        input.focus();
        input.select();

        const saveEdit = () => {
            nodeToEdit.text = input.value.trim() || "未命名节点";
            li.replaceChild(span, input); // 恢复span
            ui.render(); // 重新渲染以更新所有视图
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                li.replaceChild(span, input); // 取消编辑
                input.removeEventListener('blur', saveEdit);
            }
        });
    }

    // --- 新增：右键菜单逻辑 ---
    function handleContextMenu(e) {
        e.preventDefault();
        const li = e.target.closest('li');
        if (!li) return;

        const nodeId = parseInt(li.dataset.id, 10);
        state.contextMenuNode = actions.findNodeById(state.root, nodeId);
        
        // 更新并显示菜单
        dom.contextMenu.style.top = `${e.clientY}px`;
        dom.contextMenu.style.left = `${e.clientX}px`;
        
        // 根据所选节点更新菜单项状态
        const isRoot = state.contextMenuNode === state.root;
        dom.contextMenu.querySelector('[data-action="add-sibling"]').classList.toggle('disabled', isRoot);
        dom.contextMenu.querySelector('[data-action="delete"]').classList.toggle('disabled', isRoot);
        
        dom.contextMenu.style.display = 'block';
    }

    // --- 事件绑定 (Event Listeners) ---
    function bindEvents() {
        // 节点选择
        dom.interactiveTree.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li && li.dataset.id) {
                state.selectedNode = actions.findNodeById(state.root, parseInt(li.dataset.id, 10));
                ui.render();
            }
        });

        // 绑定双击编辑
        dom.interactiveTree.addEventListener('dblclick', handleDoubleClick);

        // 绑定右键菜单
        dom.interactiveTree.addEventListener('contextmenu', handleContextMenu);

        // 点击其他地方隐藏右键菜单
        window.addEventListener('click', () => {
            dom.contextMenu.style.display = 'none';
        });

        // 右键菜单项的点击事件
        dom.contextMenu.addEventListener('click', (e) => {
            const target = e.target;
            if (target.tagName !== 'LI' || target.classList.contains('disabled')) return;

            const action = target.dataset.action;
            const node = state.contextMenuNode;

            switch (action) {
                case 'add-child':
                    actions.addChild(node);
                    break;
                case 'add-sibling':
                    actions.addSibling(node);
                    break;
                case 'delete':
                    actions.deleteNode(node);
                    break;
            }
            dom.contextMenu.style.display = 'none'; // 操作后隐藏
        });
        
        dom.btnCopy.addEventListener('click', actions.copyAscii);
    }

    // --- 应用初始化 ---
    function init() {
        bindEvents();
        ui.render(); // 首次渲染
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();