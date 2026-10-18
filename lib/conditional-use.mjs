import {orderedTwoVarietyWitnesses,orderedTwoVarietyEvidence} from './ordered-two-variety.mjs';
import {conditionalVineyardWitnesses,conditionalVineyardEvidence} from './conditional-vineyard.mjs';
import {authorizedVarietalLabelWitnesses,authorizedVarietalLabelEvidence} from './authorized-varietal-label.mjs';
export function conditionalUseWitnesses(rule){
 if(rule?.conditionalUse?.profile==='it-ordered-two-variety-v1')return orderedTwoVarietyWitnesses(rule);
 return rule?.conditionalUse?.profile==='it-authorized-varietal-label-v1'?authorizedVarietalLabelWitnesses(rule):conditionalVineyardWitnesses(rule);
}
export function conditionalUseEvidence(rule){
 if(rule?.conditionalUse?.profile==='it-ordered-two-variety-v1')return orderedTwoVarietyEvidence(rule);
 return rule?.conditionalUse?.profile==='it-authorized-varietal-label-v1'?authorizedVarietalLabelEvidence(rule):conditionalVineyardEvidence(rule);
}
