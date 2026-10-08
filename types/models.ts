import type { Database } from './database.types'

type PublicSchema = Database['public']
type Row<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
type Insert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
type Update<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

export type TaskPriority = PublicSchema['Enums']['task_priority']

export type Task = Row<'tasks'>
export type TaskInsert = Insert<'tasks'>
export type TaskUpdate = Update<'tasks'>

export type AgendaEvent = Row<'events'>
export type AgendaEventInsert = Insert<'events'>
export type AgendaEventUpdate = Update<'events'>

export type Reminder = Row<'reminders'>
export type ReminderInsert = Insert<'reminders'>
export type ReminderUpdate = Update<'reminders'>

export type Family = Row<'families'>
export type FamilyMember = Row<'family_members'>
export type FamilyRole = PublicSchema['Enums']['family_role']
export type MemberStatus = PublicSchema['Enums']['member_status']
