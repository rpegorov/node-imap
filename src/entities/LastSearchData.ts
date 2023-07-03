import { BaseEntity, Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class LastSearchData extends BaseEntity {
     
    @PrimaryColumn()
    user!: string;

    @Column({type: 'datetime'})
    dateLastMessage!: Date;

    @Column()
    lastMessageId!: number;
}