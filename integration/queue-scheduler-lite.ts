import{Agent,Task,TaskResult,TaskPriority}from'../types';interface QT{id:string;task:Task;priority:TaskPriority;status:'pending'|'processing'|'completed'|'failed';agentId?:string;result?:TaskResult;createdAt?:number;}
export class TaskQueue{private q:QT[]=[];private c=0;
enqueue(t:Task,p?:TaskPriority):string{const id=`task-${++this.c}`;this.q.push({id,task:t,priority:p||t.priority||'medium',status:'pending',createdAt:Date.now()});this.q.sort((a,b)=>{const o:Record<TaskPriority,number>={critical:0,high:1,medium:2,low:3};return o[a.priority]-o[b.priority]||(a.createdAt||0)-(b.createdAt||0)});return id;}
dequeue():QT|null{const i=this.q.findIndex(t=>t.status==='pending');if(i===-1)return null;this.q[i].status='processing';return this.q[i];}
updateStatus(id:string,s:QT['status'],r?:TaskResult,aid?:string){const t=this.q.find(x=>x.id===id);if(t){t.status=s;if(r)t.result=r;if(aid)t.agentId=aid;}}
clear(){this.q=[];this.c=0;}}
export class Scheduler{private agents=new Map<string,Agent>();private st=new Map<string,'idle'|'busy'>();private lst=new Map<string,Set<Function>>();
registerAgent(a:Agent){this.agents.set(a.getId(),a);this.st.set(a.getId(),'idle');}
getIdleAgent():Agent|null{for(const[id,a]of this.agents.entries())if(this.st.get(id)==='idle')return a;return null;}
async assignTask(a:Agent,t:QT):Promise<TaskResult>{const id=a.getId();this.st.set(id,'busy');try{const r=await a.execute(t.task);this.emit('taskCompleted',{taskId:t.id,result:r,agentId:id});return r;}catch(e){const r:TaskResult={status:'failed',message:e instanceof Error?e.message:'Error',data:null};this.emit('taskFailed',{taskId:t.id,error:r,agentId:id});return r;}finally{this.st.set(id,'idle');}}
on(e:string,cb:Function){if(!this.lst.has(e))this.lst.set(e,new Set());this.lst.get(e)!.add(cb);}
private emit(e:string,d?:any){this.lst.get(e)?.forEach(cb=>cb(d));}
shutdown(){this.agents.clear();this.st.clear();this.lst.clear();}}
export class QueueSchedulerLite{private q:TaskQueue;private s:Scheduler;private run=false;private int:any;
constructor(q:TaskQueue,s:Scheduler){this.q=q;this.s=s;this.s.on('taskCompleted',()=>{const n=this.q.dequeue();if(n)this.proc(n);});}
private async proc(t:QT){const a=this.s.getIdleAgent();if(!a||!a.canHandle(t.task)){this.q.updateStatus(t.id,'pending');return;}this.q.updateStatus(t.id,'processing',undefined,a.getId());const r=await this.s.assignTask(a,t);this.q.updateStatus(t.id,r.status==='success'?'completed':'failed',r);}
start(ms=1000){if(this.run)return;this.run=true;this.int=setInterval(async()=>{if(!this.run)return;const t=this.q.dequeue();if(t)await this.proc(t);},ms);}
stop(){this.run=false;if(this.int)clearInterval(this.int);}
submitTask(t:Task,p?:TaskPriority){return this.q.enqueue(t,p);}
getQueue(){return this.q;}getScheduler(){return this.s;}
shutdown(){this.stop();this.s.shutdown();this.q.clear();}}
export const createQueueSchedulerLite=()=>new QueueSchedulerLite(new TaskQueue(),new Scheduler());
