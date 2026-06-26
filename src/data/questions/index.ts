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
import { lesson4950Questions } from './lesson-49-50';
import { lesson5152Questions } from './lesson-51-52';
import { lesson5354Questions } from './lesson-53-54';
import { lesson5556Questions } from './lesson-55-56';
import { lesson5758Questions } from './lesson-57-58';
import { lesson5960Questions } from './lesson-59-60';
import { lesson6162Questions } from './lesson-61-62';
import { lesson6364Questions } from './lesson-63-64';
import { lesson6566Questions } from './lesson-65-66';
import { lesson6768Questions } from './lesson-67-68';
import { lesson6970Questions } from './lesson-69-70';
import { lesson7172Questions } from './lesson-71-72';
import { lesson7374Questions } from './lesson-73-74';
import { lesson7576Questions } from './lesson-75-76';
import { lesson7778Questions } from './lesson-77-78';
import { lesson7980Questions } from './lesson-79-80';
import { lesson8182Questions } from './lesson-81-82';
import { lesson8384Questions } from './lesson-83-84';
import { lesson8586Questions } from './lesson-85-86';
import { lesson8788Questions } from './lesson-87-88';
import { lesson8990Questions } from './lesson-89-90';
import { lesson9192Questions } from './lesson-91-92';
import { lesson9394Questions } from './lesson-93-94';
import { lesson9596Questions } from './lesson-95-96';
import { lesson9798Questions } from './lesson-97-98';
import { lesson99100Questions } from './lesson-99-100';
import { lesson101102Questions } from './lesson-101-102';
import { lesson103104Questions } from './lesson-103-104';
import { lesson105106Questions } from './lesson-105-106';
import { lesson107108Questions } from './lesson-107-108';
import { lesson109110Questions } from './lesson-109-110';
import { lesson111112Questions } from './lesson-111-112';
import { lesson113114Questions } from './lesson-113-114';
import { lesson115116Questions } from './lesson-115-116';
import { lesson117118Questions } from './lesson-117-118';
import { lesson119120Questions } from './lesson-119-120';
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
  lesson4950Questions,
  lesson5152Questions,
  lesson5354Questions,
  lesson5556Questions,
  lesson5758Questions,
  lesson5960Questions,
  lesson6162Questions,
  lesson6364Questions,
  lesson6566Questions,
  lesson6768Questions,
  lesson6970Questions,
  lesson7172Questions,
  lesson7374Questions,
  lesson7576Questions,
  lesson7778Questions,
  lesson7980Questions,
  lesson8182Questions,
  lesson8384Questions,
  lesson8586Questions,
  lesson8788Questions,
  lesson8990Questions,
  lesson9192Questions,
  lesson9394Questions,
  lesson9596Questions,
  lesson9798Questions,
  lesson99100Questions,
  lesson101102Questions,
  lesson103104Questions,
  lesson105106Questions,
  lesson107108Questions,
  lesson109110Questions,
  lesson111112Questions,
  lesson113114Questions,
  lesson115116Questions,
  lesson117118Questions,
  lesson119120Questions,
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
