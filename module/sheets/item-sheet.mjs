export class GenericItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["secrets", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/buried-secrets/templates/item";

    let generic_template = ["skill", "ability"];
    let template_name = `${this.item.data.type}`;

    if (generic_template.includes(this.item.data.type)) {
      template_name = "generic";
    }

    return `${path}/${template_name}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.data;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // isGM and editable (for the sheet to use)
    context.isGM = game.user.isGM;
    context.editable = this.options.editable;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = itemData.data;
    context.flags = itemData.flags;

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find('.add-playbook-action').click(this.addPlaybookAction.bind(this));
  }
  
  async addPlaybookAction(event) {
    event.preventDefault();
    const abilities = this.item.data.data.actions;
    const att = $('select.new_action')[0].value;
    const val = $('input.new_action_val')[0].value;
    console.log(`${att} = ${val}`);
    abilities[att] = val;
    const updates = {_id: this.item.id, data: { actions: abilities}};
    const updated = await this.item.update(updates);
  }
}
