import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.date();
export const EmailSchema = z.string().email();
export const PaswordSchema = z.string().min(8);
