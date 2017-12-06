class SelectArrayTemplate {
    constructor(container) {
        this.container = container;

        if (this.getName() === undefined) {
            this.container = this.container.closest('[data-grav-select-array-name]');
        }
    }

    getName() {
        return this.container.data('grav-select-array-name') || '';
    }

    getKeyPlaceholder() {
        return this.container.data('grav-select-array-keyname') || 'Key';
    }

    shouldBeDisabled() {
        // check for toggleables, if field is toggleable and it's not enabled, render disabled
        let toggle = this.container.closest('.form-field').find('[data-grav-field="toggleable"] input[type="checkbox"]');
        return toggle.length && toggle.is(':not(:checked)');
    }

    getNewRow() {
        let tpl = '';
        tpl += `
        <div class="form-row" data-grav-select-array-type="row">
            <span data-grav-select-array-action="sort" class="fa fa-bars"></span>
            <span data-grav-select-array-action="rem" class="fa fa-minus"></span>
            <span data-grav-select-array-action="add" class="fa fa-plus"></span>
            <div class="form-select-array-wrapper">
                <select data-grav-select-array-type="key" ${this.shouldBeDisabled() ? 'disabled="disabled"' : ''}>
                    <option value="" disabled selected>${this.getKeyPlaceholder()}</option>
                </select>
            </div>
            <div class="form-select-array-value-wrapper"></div>
        </div>    
        `;

        return tpl;
    }
}

class SelectArrayField {

    setupItemData(container, name){
        let options = [];
        let optionsData = container.data("select-array-options");
        container.removeAttr("data-select-array-options");
        for(let key in optionsData){
            if (!("name" in optionsData[key])) {
                optionsData[key].name = key;
            }
            optionsData[key].name = name + "." + optionsData[key].name;

            if (!("displayName" in optionsData[key])) {
                optionsData[key].displayName = key;
            }

            let obj = {text: optionsData[key].displayName, key: key};
            if ("group" in optionsData[key]) {
                obj.optgroup = optionsData[key].group;
                delete optionsData[key].group;
            }
            obj.value = JSON.stringify(optionsData[key]);

            options.push(obj);
        }

        container.data("select-array-bare-name", name);
        container.data("select-array-options-list", options);
        container.data("select-array-options-available", options);
        container.data("select-array-options-selectors", []);

        let settings = container.data("select-array-settings");
        if (settings) {
            container.removeAttr("data-select-array-settings");
        } else {
            settings = {ignoreMissing: false}
        }
        container.data("select-array-settings", settings);

        container.find('>.form-row>.form-select-array-wrapper').each((index, element) => this.addSelector(element, container));

        container.unbind("click touch");
        container.on('click touch', '>.form-row>[data-grav-select-array-action]:not([data-grav-select-array-action="sort"])', (event) => this.actionEvent(event, container));

        let containersort = container.get(0);
        Sortable.create(containersort, {
            handle: '.fa-bars.selectSortHandle',
            animation: 150,
            draggable: '.form-row',
            group: {name: name + 'selectArray', pull: true, put: true},
            onStart: () => console.log("Dragging Array")
        });
        // container.data('select-array-sort', new Sortable(container.get(0), {
        //     handle: '.fa-bars',
        //     animation: 150
        // }));
    }

    actionEvent(event, container) {
        event && event.preventDefault();
        let element = $(event.target);
        let action = element.data('grav-select-array-action');
        SelectArrayField._setTemplate(element, container);
        this[`${action}Action`](element, container);

        let siblings = container.find('> div');
        container[siblings.length > 1 ? 'removeClass' : 'addClass']('one-child');
    }

    addAction(element, container) {
        let template = element.data('select-array-template');
        let row = element.closest('[data-grav-select-array-type="row"]');
        let newTemp = template.getNewRow();
        row.after(newTemp).get(0);
        row.next().find('.form-select-array-wrapper').each((index, element) => this.addSelector(element, container));
    }

    remAction(element, container) {
        let template = element.data('select-array-template');
        let row = element.closest('[data-grav-select-array-type="row"]');
        let isLast = !row.siblings().length;

        if (isLast) {
            this.addAction(element, container);
        }

        let selectors = container.data("select-array-options-selectors");
        for (let key in selectors){
            let current = container.data("select-array-options-selectors")[key];
            if (current.is(row.find(".form-select-array-wrapper>select").selectize())) {
                current[0].selectize.destroy();
                selectors.splice(key, 1);
                break;
            }
        }
        row.remove();
        SelectArrayField.updateArrayOptions(container);
    }

    static checkMultiline(type, row) {
        let multilinetype = [
            "advancedArray",
            "array",
            "textarea"
        ];
        if (multilinetype.indexOf(type) !== -1) {
            row.addClass("selectMultiline");
        } else {
            row.removeClass("selectMultiline");
        }
    }

    valueChange() {
        return function (value) {
            let field = JSON.parse(value);
            let $wrapper = this.$wrapper;
            let $wrapper2 = $wrapper.closest(".form-select-array-wrapper");
            let container = $wrapper2.parent().parent();
            let $valueWrapper = $wrapper2.siblings(".form-select-array-value-wrapper");
            let oldValue = $wrapper2.data("select-array-old-value");

            let data = {field: field};

            let ajaxCallback = container.data("select-array-ajax-callback");

            if(oldValue) {
                data.oldValue = oldValue;
                $wrapper2.removeAttr("data-select-array-old-value");
                $wrapper2.data("select-array-old-value", "");
                $.removeData($wrapper2, "select-array-old-value");
            }

            SelectArrayField.checkMultiline(field.type, $wrapper2.parent());

            $valueWrapper.html("Loading...");

            $.ajax({
                method: "POST",
                url: "/admin/formfieldajaxdata",
                data: data
            })
            .done(function( msg ) {
                let fieldRtn = $(msg).find('.form-field [data-grav-field="' + field.type + '"]').get(0);
                if (fieldRtn) {
                    $valueWrapper.html("");
                    $valueWrapper.append(fieldRtn);
                    SelectArrayField.fixBrokenFields(fieldRtn, field);
                    if (ajaxCallback && ajaxCallback.constructor === Function) {
                        ajaxCallback();
                    }
                } else {
                    $valueWrapper.html("Error! Try another value.");
                }
            });

            let optionsAval = SelectArrayField.updateArrayOptions(container);
            container.data('select-array-options-available', optionsAval);
        }
    }

    addSelector(element, container) {
        element = $(element);

        let data = element.data('grav-selectize') || {};
        let field = element.find('input, select');
        if (!field.length || field.get(0).selectize) { return; }

        let options = JSON.parse(JSON.stringify(container.data('select-array-options-available')));
        let groups = [];

        for (let option in options) {
            if ("optgroup" in options[option]) {
                let optgroup = options[option].optgroup;
                if ((groups.map(function(e) { return e.value; }).indexOf(optgroup)) === -1) {
                    groups.push({
                        label: optgroup.charAt(0).toUpperCase() + optgroup.substring(1),
                        value: optgroup
                    });
                }
            }
        }

        data.create = function(input){
            return {
                text: input,
                value: JSON.stringify({
                    type: "text",
                    name: container.data("select-array-bare-name") + '.' + input,
                    displayName: input
                })
            };
        };
        data.optgroups = groups;
        data.options = options;
        data.onChange = this.valueChange();
        data.addPrecedence = true;
        data.hideSelected = true;
        data.onFocus = function() {
            this.clear(true);
        };

        let selector = field.selectize(data);
        container.data("select-array-options-selectors").push(selector);

        if(element.data("select-array-old-key")) {
            let pos = container.data("select-array-options-list").map(function(e) { return e.key; }).indexOf(element.data("select-array-old-key"));
            if (pos !== -1) {
                let selected = container.data("select-array-options-list")[pos];
                selector[0].selectize.setValue(selected.value, true);
                element.removeAttr("data-select-array-old-key");
                element.data("select-array-old-key", "");
                $.removeData(element, "select-array-old-key");

                if(element.data("select-array-value-holder")) {
                    let element2 = element.siblings(".form-select-array-value-wrapper");
                    let value = JSON.parse(selected.value);
                    let fieldRtn = $(element.data("select-array-value-holder")).find('[data-grav-field="' + value.type + '"]').get(0);

                    let ajaxCallback = container.data("select-array-ajax-callback");

                    SelectArrayField.checkMultiline(value.type, element2.parent());

                    element2.html("");
                    element2.append(fieldRtn);

                    element.removeAttr("data-select-array-value-holder");
                    element.data("select-array-value-holder", "");
                    $.removeData(element, "select-array-value-holder");

                    SelectArrayField.fixBrokenFields(fieldRtn, value);
                    if (ajaxCallback && ajaxCallback.constructor === Function) {
                        ajaxCallback();
                    }

                    let optionsAval = SelectArrayField.updateArrayOptions(container);
                    container.data('select-array-options-available', optionsAval);
                }
            } else {
                if (!container.data("select-array-settings").ignoreMissing) {
                    let val = {
                        text: element.data("select-array-old-key"),
                        value: JSON.stringify({
                            type: "text",
                            name: container.data("select-array-bare-name") + '.' + element.data("select-array-old-key"),
                            displayName: element.data("select-array-old-key")
                        })
                    };
                    selector[0].selectize.addOption(val);
                    selector[0].selectize.setValue(val.value);
                } else {
                    element.removeAttr("data-select-array-old-key");
                    element.data("select-array-old-key", "");
                    $.removeData(element, "select-array-old-key");

                    element.removeAttr("data-select-array-old-value");
                    element.data("select-array-old-value", "");
                    $.removeData(element, "select-array-old-value");
                }
            }

        }

    }

    static _setTemplate(element, container) {
        if (!element.data('select-array-template')) {
            element.data('select-array-template', new SelectArrayTemplate(container));
        }
    }

    static updateArrayOptions(container){
        let options = JSON.parse(JSON.stringify(container.data('select-array-options-list')));
        let optionsAval = JSON.parse(JSON.stringify(options));
        let selectors = container.data('select-array-options-selectors');


        //Get all selectors and remove all selected values from the available values list
        selectors.forEach(function(element){
            let val = element[0].selectize.getValue();
            if (val) {
                let pos = optionsAval.map(function(e) { return e.value; }).indexOf(val);
                if(pos !== -1){
                    optionsAval.splice(pos,1);
                }
            }
        });

        //Remove all options from all selectors except for the currently selected option, then re add all available options
        selectors.forEach(function (element) {
            let selector = element[0].selectize;
            let val = selector.getValue();
            for (let option in selector.options) {
                if(option !== val) {
                    selector.removeOption(option);
                }
            }
            for (let option in optionsAval){
                selector.addOption(optionsAval[option]);
            }
        });

        container.data('select-array-options-available', optionsAval);
        return optionsAval;
    }

    static fixBrokenFields(field, data){
        if (data.type == "colorpicker") {
            let colorpicker = $(field).find("[data-grav-colorpicker]");
            let options = Object.assign({}, colorpicker.data('grav-colorpicker'));

            if (options.update) {
                colorpicker.on('change._grav_colorpicker', (event, field, hex, opacity) => {
                    let backgroundColor = hex;
                    let hex2 = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);

                    let rgb =  {
                        r: hex2 >> 16,
                        g: (hex2 & 0x00FF00) >> 8,
                        b: (hex2 & 0x0000FF)
                    };

                    if (opacity < 1.00) {
                        backgroundColor = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + opacity + ')';
                    }

                    let target = colorpicker.closest(options.update);
                    if (!target.length) {
                        target = colorpicker.siblings(options.update);
                    }
                    if (!target.length) {
                        target = colorpicker.parent('.g-colorpicker').find(options.update);
                    }

                    target.css({ backgroundColor });
                });
            }
        }
    }



}