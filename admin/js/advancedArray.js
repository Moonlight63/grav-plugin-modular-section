
class AdvancedArrayField {
    constructor() {
        this.arrays = $();
        this.selectArray = new SelectArrayField();
        $('[data-grav-field="advancedArray"]').each((index, list) => this.addArray(list));
        $('body').on('mutation._grav', this._onAddedNodes.bind(this));
    }

    addArray(list) {
        list = $(list);
        list.data("arrayInit", true);
        list.find('[data-grav-advanced-array-type="container"]').each((index, container) => {
            container = $(container);
            let formattedName = container.closest('[data-grav-advanced-array-name]').data('grav-advanced-array-name');
            let dotname = formattedName.replace("data[", "").replace(/]\[/g, ".").replace("]", "");
            this.selectArray.setupItemData(container, dotname);
        });
    }

    _onAddedNodes(event, target/* , record, instance */) {
        let arrays = $(target).find('[data-grav-field="advancedArray"]');
        if (!arrays.length) { return; }

        arrays.each((index, list) => {
            list = $(list);
            if(!list.data('arrayInit')){
                this.addArray(list);
            }
        });
    }
}

$(document).ready(function () {
    let Instance = new AdvancedArrayField();
});
