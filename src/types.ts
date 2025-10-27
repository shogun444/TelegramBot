export type Video = {
  file_id:string ,
   file_name:string , 
   duration? : number | null , 
   file_size? :number | undefined | null,
   thumbnail ?: any,
  link? : string,
  message_id : number,
  chat_id?:  string;     
  gramjs_message_id?: number;
 telegram_link : string,
  mime_type?: string | undefined,
  width?: number;
height?: number;  
}