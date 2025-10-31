export type Video = {
  file_id:string ,
   file_name:string , 
   duration? : number | null , 
   file_size? :string | undefined | null,
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

export type SeriesEpisode = {
  file_id: string;
  file_name: string;
  message_id: number;
  chat_id?: string;
  telegram_link: string;
  thumbnail?: string | null;
  file_size?: string | undefined | null;
  mime_type?: string | undefined;
  // TV-specific fields
  series_name: string;
  tmdb_series_id: number;
  tmdb_season_id : number | null
  season_number: number;
  episode_number: number;
  // You may want to add these if you store them
  width?: number | null;
  height?: number | null;
  tmdbEpisodeId: number;
  episode_title?: string;
  episode_overview?: string;
  episode_air_date?: string;
  episode_still?: string;
  runtime?: number;
  vote_average?: number;
};