export interface Stage { at: number; image?: string; label?: string }
export interface Requirements { requiresPlaced?: {meadowId:string;slotId:string}[]; requiresMemories?: string[] }
export interface Item extends Requirements { id:string; meadowId?:string; workUnits:number; yarnCost:number; art:{stages:Stage[]} }
export type ManualAction='pet'|'sniff'|'water'|'sway'|'knock'|'glow'|'land'|'greet'|'brew'|'feed'|'rock'|'shelter';
export const MANUAL_ACTIONS:readonly ManualAction[];
export interface Interaction extends Requirements {id:string;requires:string[];actorSlot?:string;action:ManualAction;trigger:'manual'|'idle';amount:number;cooldownMs:number;workBonus?:number}
export interface Meadow extends Requirements {id:string;slots:{id:string;itemId:string}[];passive?:({id:string;requires:string[];ratePerHour:number}&Requirements)[];interactions?:Interaction[]}
export interface Upgrade extends Requirements {id:string;target:'click'|'idle';baseCost:number;costMultiplier:number;amount:number;maxLevel:number}
export interface Visitor {itemId:string;meadowId:string;x:number;y:number;scale:number;z?:number}
export interface WorldEvent extends Requirements {id:string;trigger:'automatic'|'project';delayMs:number;visitMs:number;cooldownMs?:number;repeatable?:boolean;rewardYarn?:number;visitor?:Visitor}
export interface Recipe extends Item {eventId:string}
export interface Config {initialYarn:number;reserveYarnPerHour:number;clickWork:number;idleWorkPerSecond:number;defaultCraftAuto?:boolean;recraftableIds?:string[];maxOfflineMs:number;items:Item[];meadows:Meadow[];upgrades:Upgrade[];recipes?:Recipe[];worldEvents?:WorldEvent[];migrationV1?:{workUnits:Record<string,number>;ruleIds:string[]}}
export type Project=({itemId:string;recipeId?:never;recraft?:true}|{recipeId:string;itemId?:never;recraft?:never})&{work:number};
export interface Memory {firstAt:number;lastAt:number;count:number}
export interface EventState {phase:'waiting'|'visiting'|'resting'|'done'|'available';dueAt:number|null;count:number}
export interface State {version:2;lastTimestamp:number;craftAuto:boolean;wallet:{yarn:number};project:Project|null;owned:string[];placements:Record<string,Record<string,string>>;upgrades:Record<string,number>;cooldowns:Record<string,number>;transactionSequence:number;events:Record<string,EventState>;memories:Record<string,Memory>;accrual:{baseYarn:number;baseWork:number;elapsedMs:number;automatic:Record<string,number>;events:Record<string,number>}}
export type Action={now:number}&({type:'startProject'|'startRecraft';itemId:string}|{type:'startRecipe';recipeId:string}|{type:'setCraftAuto';enabled:boolean}|{type:'click'|'completeCraft'|'cancelRecraft'}|{type:'buyUpgrade';upgradeId:string}|{type:'placeItem';meadowId:string;slotId:string}|{type:ManualAction|'interact';meadowId:string;interactionId:string});
export interface View {
 wallet:State['wallet'];owned:string[];craftAuto:boolean;rates:{click:number;idle:number;yarnPerHour:number};
 project:(Project&{progress:number;remaining:number;etaSeconds:number|null;stage:number;canComplete:boolean})|null;
 projects:{itemId:string;yarnCost:number;unlocked:boolean;canStart:boolean;canRecraft:boolean}[];
 recipes:{recipeId:string;yarnCost:number;unlocked:boolean;canStart:boolean}[];
 upgrades:{id:string;target:'click'|'idle';level:number;cost:number;current:number;next:number;maxed:boolean;canBuy:boolean}[];
 meadows:{id:string;unlocked:boolean;slots:(Meadow['slots'][number]&{placed:boolean;canPlace:boolean})[];interactions:{id:string;action:ManualAction;actorSlot?:string;trigger:Interaction['trigger'];amount:number;workBonus:number;active:boolean;available:boolean;readyAt:number|null}[]}[];
 events:{id:string;meadowId?:string;unlocked:boolean;phase:EventState['phase']|'locked';dueAt:number|null;count:number}[];
 visitors:(Visitor&{eventId:string;until:number})[];memories:State['memories'];
}
export function requirementsMet(state:State,definition?:Requirements):boolean;
export function validateConfig(config:Config):Config;
export function createInitialState(config:Config,now:number):State;
export function advanceTime(state:State,now:number,config:Config):State;
export function dispatch(state:State,action:Action,config:Config):State;
export function selectView(state:State,catalog:Config):View;
export function serializeState(state:State):string;
export function deserializeState(json:string,config:Config):State;
/** Explicit config change; elapsed time settles with fromConfig before work-ratio scaling. */
export function migrateConfigState(state:State,fromConfig:Config,toConfig:Config,now:number):State;
