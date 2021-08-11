
export class SecretsActor extends Actor {
    /** @override */
    static async create(data, options={}) {

        data.token = data.token || {};

        // For Crew and Character set the Token to sync with charsheet.
        switch (data.type) {
            case 'character':
            case 'npc':
                //case '\uD83D\uDD5B clock':
                data.token.actorLink = true;
                break;
        }

        return super.create(data, options);
    }

    /**
     * @override
     * Augment the basic actor data with additional dynamic data. Typically,
     * you'll want to handle most of your calculated/derived data in this step.
     * Data calculated in this step should generally not exist in template.json
     * (such as ability modifiers rather than ability scores) and should be
     * available both inside and outside of character sheets (such as if an actor
    * is queried and has a roll executed directly from it).
    */
    prepareDerivedData() {
        const actorData = this.data;
        const data = actorData.data;
        // for type=character: derive attributes (insight, prowess, resolve)
    }
}
