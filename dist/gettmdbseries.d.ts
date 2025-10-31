export declare function getTvTmdbResultsWithRetry(seriesName: string): Promise<any[]>;
export declare function getEpisodeDetails(seriesId: number, seasonNumber: number, episodeNumber: number): Promise<any>;
export declare function getTvSeriesIdByNameWithRetry(seriesTmdbId: number, seasonNumber: number): Promise<number | null>;
export declare function getTmdbIdWithRetry(cleanTitle: string): Promise<number | null>;
//# sourceMappingURL=gettmdbseries.d.ts.map