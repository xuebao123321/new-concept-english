// 题库统一入口
// 导入所有课文组的题目

import { lesson0102Questions } from './lesson-01-02';
import { lesson0304Questions } from './lesson-03-04';
import { lesson0506Questions } from './lesson-05-06';
import { lesson0708Questions } from './lesson-07-08';
import { lesson0910Questions } from './lesson-09-10';
import { lesson1112Questions } from './lesson-11-12';
import { lesson1314Questions } from './lesson-13-14';
import { lesson1516Questions } from './lesson-15-16';
import { lesson1718Questions } from './lesson-17-18';
import { lesson1920Questions } from './lesson-19-20';
import { lesson2122Questions } from './lesson-21-22';
import { lesson2324Questions } from './lesson-23-24';
import { lesson2526Questions } from './lesson-25-26';
import { lesson2728Questions } from './lesson-27-28';
import { lesson2930Questions } from './lesson-29-30';
import { lesson3132Questions } from './lesson-31-32';
import { lesson3334Questions } from './lesson-33-34';
import { lesson3536Questions } from './lesson-35-36';
import { lesson3738Questions } from './lesson-37-38';
import { lesson3940Questions } from './lesson-39-40';
import { lesson4142Questions } from './lesson-41-42';
import { lesson4344Questions } from './lesson-43-44';
import { lesson4546Questions } from './lesson-45-46';
import { lesson4748Questions } from './lesson-47-48';
import type { Question } from '../../types';

const allQuestionArrays: Question[][] = [
  lesson0102Questions,
  lesson0304Questions,
  lesson0506Questions,
  lesson0708Questions,
  lesson0910Questions,
  lesson1112Questions,
  lesson1314Questions,
  lesson1516Questions,
  lesson1718Questions,
  lesson1920Questions,
  lesson2122Questions,
  lesson2324Questions,
  lesson2526Questions,
  lesson2728Questions,
  lesson2930Questions,
  lesson3132Questions,
  lesson3334Questions,
  lesson3536Questions,
  lesson3738Questions,
  lesson3940Questions,
  lesson4142Questions,
  lesson4344Questions,
  lesson4546Questions,
  lesson4748Questions,
];

export function getAllQuestions(): Question[] {
  return allQuestionArrays.flat();
}

export function getQuestionsByGroup(group: string): Question[] {
  return allQuestionArrays
    .flat()
    .filter(q => q.lessonGroup === group);
}

export function getQuestionsByType(type: string): Question[] {
  return allQuestionArrays
    .flat()
    .filter(q => q.type === type);
}

// Phase 1.5 新增：按学习块筛选题目
export function getQuestionsByBlock(group: string, block: string): Question[] {
  return getQuestionsByGroup(group).filter(q => (q as any).block === block);
}

export { allQuestionArrays };
