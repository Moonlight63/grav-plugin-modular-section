
class SelectableListField {
    constructor() {
        this.lists = $();

        this.selectArray = new SelectArrayField();

        $('[data-type="SelectableList"]').each((index, list) => this.addList(list));
        $('body').on('mutation._grav', this._onAddedNodes.bind(this));

    }

    addList(list) {
        list = $(list);
        this.lists = this.lists.add(list);

        list.on('click', '> .collection-actions [data-action="add"]', (event) => this.addItem(event));
        list.on('click', '> ul > li > .item-actions [data-action="delete"]', (event) => this.removeItem(event));
        list.on('click', '> ul > li > .item-actions [data-action="collapse"]', (event) => this.collapseItem(event));
        list.on('click', '> ul > li > .item-actions [data-action="expand"]', (event) => this.expandItem(event));
        list.on('click', '> .collection-actions [data-action-sort="date"]', (event) => this.sortItems(event));
        list.on('click', '> .collection-actions [data-action="collapse_all"]', (event) => this.collapseItems(event));
        list.on('click', '> .collection-actions [data-action="expand_all"]', (event) => this.expandItems(event));
        list.on('input change', '[data-key-observe]', (event) => this.observeKey(event));

        list.find('[data-collection-holder]').each((index, container) => {
            container = $(container);
            if (container.data('collection-sort') || container[0].hasAttribute('data-collection-nosort')) { return; }

            let containersort = container.get(0);
            Sortable.create(containersort, {
                handle: '.collection-sort',
                animation: 150,
                onUpdate: () => SelectableListField.reindex(container),
                onStart: () => console.log("Dragging List")
            });
            /*container.data('collection-sort', new Sortable(container.get(0), {
                // forceFallback: false,
                handle: '.collection-sort',
                animation: 150,
                group: {name: 'selectList', pull: true, put: true},
                draggable: '.listDraggable',
                // filter: '.CodeMirror, .grav-editor-resizer',
                onUpdate: () => SelectableListField.reindex(container),
                onStart: () => console.log("Dragging List")
            }));*/
        });

        let existingItems = list.find(">[data-collection-holder]>[data-collection-item]>.listDraggable");
        existingItems.each((index, element) => this.createSelectArray($(element), list));

        this._updateActionsStateBasedOnMinMax(list);


    }

    createSelectArray(container, list) {
        container.data("select-array-ajax-callback", function() {
            SelectableListField.reindex(list);
        });
        let formattedName = container.parent().data("collection-item");
        let dotname = formattedName.replace("data[", "").replace(/]\[/g, ".").replace("]", "");
        this.selectArray.setupItemData(container, dotname);
    }

    addItem(event) {
        let button = $(event.currentTarget);
        let position = button.data('action-add') || 'bottom';
        let list = $(button.closest('[data-type="SelectableList"]'));
        let template = $(list.find('> [data-collection-template="new"]').data('collection-template-html'));

        this._updateActionsStateBasedOnMinMax(list);
        let items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');
        let maxItems = list.data('max');
        if (typeof maxItems !== 'undefined' && items.length >= maxItems) {
            return;
        }

        list.find('> [data-collection-holder]')[position === 'top' ? 'prepend' : 'append'](template);

        this.createSelectArray(template.find(">.listDraggable"), list);

        SelectableListField.reindex(list);

        items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');
        let topAction = list.closest('[data-type="SelectableList"]').find('[data-action-add="top"]');
        let sortAction = list.closest('[data-type="SelectableList"]').find('[data-action="sort"]');

        if (items.length) {
            if (topAction.length) { topAction.parent().removeClass('hidden'); }
            if (sortAction.length && items.length > 1) { sortAction.removeClass('hidden'); }
        }

        // refresh toggleables in a list
        $('[data-grav-field="toggleable"] input[type="checkbox"]').trigger('change');
    }

    removeItem(event) {
        let button = $(event.currentTarget);
        let item = button.closest('[data-collection-item]');
        let list = $(button.closest('[data-type="SelectableList"]'));

        let items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');
        let minItems = list.data('min');

        if (typeof minItems !== 'undefined' && items.length <= minItems) {
            return;
        }

        item.remove();
        SelectableListField.reindex(list);

        items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');
        let topAction = list.closest('[data-type="SelectableList"]').find('[data-action-add="top"]');
        let sortAction = list.closest('[data-type="SelectableList"]').find('[data-action="sort"]');

        if (!items.length) {
            if (topAction.length) { topAction.parent().addClass('hidden'); }
        }

        if (sortAction.length && items.length <= 1) { sortAction.addClass('hidden'); }
        this._updateActionsStateBasedOnMinMax(list);
    }

    collapseItems(event) {
        let button = $(event.currentTarget);
        let items = $(button.closest('[data-type="SelectableList"]')).find('> ul > [data-collection-item] > .item-actions [data-action="collapse"]');

        items.click();
    }

    collapseItem(event) {
        let button = $(event.currentTarget);
        let item = button.closest('[data-collection-item]');

        button.attr('data-action', 'expand').removeClass('fa-chevron-circle-down').addClass('fa-chevron-circle-right');
        item.addClass('collection-collapsed');
    }

    expandItems(event) {
        let button = $(event.currentTarget);
        let items = $(button.closest('[data-type="SelectableList"]')).find('> ul > [data-collection-item] > .item-actions [data-action="expand"]');

        items.click();
    }

    expandItem(event) {
        let button = $(event.currentTarget);
        let item = button.closest('[data-collection-item]');

        button.attr('data-action', 'collapse').removeClass('fa-chevron-circle-right').addClass('fa-chevron-circle-down');
        item.removeClass('collection-collapsed');
    }

    sortItems(event) {
        let button = $(event.currentTarget);
        let sortby = button.data('action-sort');
        let sortby_dir = button.data('action-sort-dir') || 'asc';
        let list = $(button.closest('[data-type="SelectableList"]'));
        let items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');

        items.sort((a, b) => {
            let A = $(a).find('[name$="[' + sortby + ']"]');
            let B = $(b).find('[name$="[' + sortby + ']"]');
            let sort;

            if (sortby_dir === 'asc') {
                sort = (A.val() < B.val()) ? -1 : (A.val() > B.val()) ? 1 : 0;
            } else {
                sort = (A.val() > B.val()) ? -1 : (A.val() < B.val()) ? 1 : 0;
            }

            return sort;
        }).each((_, container) => {
            $(container).parent().append(container);
        });

        SelectableListField.reindex(list);
    }

    observeKey(event) {
        let input = $(event.target);
        let value = input.val();
        let item = input.closest('[data-collection-key]');

        item.data('collection-key-backup', item.data('collection-key')).data('collection-key', value);
        SelectableListField.reindex(null, item);
    }

    static reindex(list, items) {
        items = items || $(list).closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');

        items.each((index, item) => {
            item = $(item);

            let observed = item.find('[data-key-observe]');
            let observedValue = observed.val();
            let hasCustomKey = observed.length;
            let currentKey = item.data('collection-key-backup');

            item.attr('data-collection-key', hasCustomKey ? observedValue : index);

            ['name', 'data-grav-field-name', 'for', 'id', 'data-grav-file-settings', 'data-grav-array-name', 'data-grav-advanced-array-name'].forEach((prop) => {
                item.find('[' + prop + '], [_' + prop + ']').each(function() {
                    let element = $(this);
                    let indexes = [];
                    let regexps = [
                        new RegExp('\\[(\\d+|\\*|' + currentKey + ')\\]', 'g'),
                        new RegExp('\\.(\\d+|\\*|' + currentKey + ')\\.', 'g')
                    ];

                    if (hasCustomKey && !observedValue) {
                        element.attr(`_${prop}`, element.attr(prop));
                        element.attr(prop, null);
                        return;
                    }

                    if (element.attr(`_${prop}`)) {
                        element.attr(prop, element.attr(`_${prop}`));
                        element.attr(`_${prop}`, null);
                    }

                    element.parents('[data-collection-key]').map((idx, parent) => indexes.push($(parent).attr('data-collection-key')));
                    indexes.reverse();

                    let matchedKey = currentKey;
                    let replaced = element.attr(prop).replace(regexps[0], (/* str, p1, offset */) => {
                        matchedKey = indexes.shift() || matchedKey;
                        return `[${matchedKey}]`;
                    });

                    replaced = replaced.replace(regexps[1], (/* str, p1, offset */) => {
                        matchedKey = indexes.shift() || matchedKey;
                        return `.${matchedKey}.`;
                    });

                    element.attr(prop, replaced);
                });
            });
        });
    }

    _onAddedNodes(event, target/* , record, instance */) {
        let collections = $(target).find('[data-type="SelectableList"]');
        if (!collections.length) { return; }

        collections.each((index, collection) => {
            collection = $(collection);
            if (!~this.lists.index(collection)) {
                this.addList(collection);
            }
        });
    }

    _updateActionsStateBasedOnMinMax(list) {
        let items = list.closest('[data-type="SelectableList"]').find('> ul > [data-collection-item]');
        let minItems = list.data('min');
        let maxItems = list.data('max');

        list.find('> .collection-actions [data-action="add"]').attr('disabled', false);
        list.find('> ul > li > .item-actions [data-action="delete"]').attr('disabled', false);

        if (typeof minItems !== 'undefined' && items.length <= minItems) {
            list.find('> ul > li > .item-actions [data-action="delete"]').attr('disabled', true);
        }

        if (typeof maxItems !== 'undefined' && items.length >= maxItems) {
            list.find('> .collection-actions [data-action="add"]').attr('disabled', true);
        }
    }
}

$(document).ready(function () {
    let Instance = new SelectableListField();
});