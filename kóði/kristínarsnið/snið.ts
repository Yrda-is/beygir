export interface Kristínarsnið {
  readonly orð: string;
  readonly auðkenni: number;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: number | null;
  readonly birting: "K" | "V";
  readonly beygingarmynd: string;
  readonly mark: string;
  readonly einkunnBeygingarmyndar: number;
  readonly málsniðBeygingarmyndar: string;
  readonly gildiBeygingarmyndar: string;
  readonly aukafletta: string;
}
