export class DicePool {

    async displayResult(actor, results) {
        let speaker = ChatMessage.getSpeaker(actor);
        let message = await renderTemplate("systems/buried-secrets/templates/secrets-roll.html", {
            rolls: results.rolls, 
            roll_status: results.roll_status, 
            resist_status: results.resist_status,
            zeromode: results.zeromode, 
            action: results.action,
            position: results.position,
            effect: results.effect
        });

        let messageData = {
            speaker: speaker,
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll: results.original_roll
        }

        await CONFIG.ChatMessage.documentClass.create(messageData, {});
    }

    rollValue(rolls, zeromode = false) {
        let sorted_rolls = rolls.map(i => i.result).sort();
        let use_die;
        let prev_use_die;

        if (zeromode) {
            use_die = sorted_rolls[0];
        } else {
            use_die = sorted_rolls[sorted_rolls.length - 1];
            if (sorted_rolls.length - 2 >= 0) {
                prev_use_die = sorted_rolls[sorted_rolls.length - 2]
            }
        }

        let critical = false;

        if (use_die === 6) {
            // if 6 - check the prev highest one.
            // 6,6 = critical success
            if (prev_use_die && prev_use_die === 6) {
                critical = true;
            }
        }
        return [use_die, critical];
    }

    getActionRollStatus(rolls, zeromode = false) {

        let [use_die, critical] = this.rollValue(rolls, zeromode);
        let roll_status;

        // 1,2,3 = failure
        if (use_die <= 3) {
            roll_status = "failure";
        } else if (use_die === 6) {
            // if 6 - check the prev highest one.
            // 6,6 = critical success
            if (critical) {
                roll_status = "critical-success";
            } else {
                // 6 = success
                roll_status = "success";
            }
        } else {
            // else (4,5) = partial success
            roll_status = "partial-success";
        }

        return roll_status;
    }

    async actionRoll(dice_amount) {
        let zeromode = false;
        if (dice_amount < 0) { dice_amount = 0;}
        if (dice_amount <= 0) {
            dice_amount = 2;
            zeromode = true;
        }
        let r = new Roll( `${dice_amount}d6`, {} );
        await r.evaluate({async: true});
        let rolls = (r.terms)[0].results;
        let roll_status = this.getActionRollStatus(rolls, zeromode);
        return [rolls, zeromode, roll_status, r];
    }
}