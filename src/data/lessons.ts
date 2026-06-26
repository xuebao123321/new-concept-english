import type { LessonMeta } from '../types';

// 新概念英语第一册 1-24课 课文元数据
// 奇数课为课文，偶数课为练习课，按两课一组组织
export const LESSONS: LessonMeta[] = [
  {
    lessonNumber: 1,
    title: 'Excuse me!',
    titleCn: '对不起！',
    group: 'lesson-01-02',
    groupId: 'lesson-01-02',
    stage: 1,
    grammarTopics: ['be动词一般疑问句', '主系表结构', 'Excuse me用法', '指示代词this'],
    vocabularyCount: 21,
    vocabulary: ['excuse', 'me', 'yes', 'is', 'this', 'your', 'handbag', 'pardon', 'it', 'thank', 'very', 'much', 'pen', 'pencil', 'book', 'watch', 'coat', 'dress', 'skirt', 'shirt', 'car', 'house'],
    sentencePatterns: ['Excuse me!', 'Is this your...?', 'Yes, it is.', 'Thank you very much.'],
    audioSrc: 'audio/lesson-01-02.mp3',
  },
  {
    lessonNumber: 3,
    title: 'Sorry, sir.',
    titleCn: '对不起，先生。',
    group: 'lesson-03-04',
    groupId: 'lesson-03-04',
    stage: 1,
    grammarTopics: ['否定句', '祈使句', 'Here is...句型', '物主代词my/your'],
    vocabularyCount: 15,
    vocabulary: ['my', 'please', 'here', 'ticket', 'number', 'five', 'sorry', 'sir', 'cloakroom', 'suit', 'school', 'teacher', 'son', 'daughter', 'umbrella'],
    sentencePatterns: ["Here's my...", 'Sorry, sir.', 'Is this your...?', 'My coat, please.'],
    audioSrc: 'audio/lesson-03-04.mp3',
  },
  {
    lessonNumber: 5,
    title: 'Nice to meet you.',
    titleCn: '很高兴见到你。',
    group: 'lesson-05-06',
    groupId: 'lesson-05-06',
    stage: 1,
    grammarTopics: ['第三人称单数主系表', '国籍表达', 'This is...介绍', 'What疑问句(品牌)'],
    vocabularyCount: 22,
    vocabulary: ['good', 'morning', 'new', 'student', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'make', 'English', 'American', 'Italian', 'Volvo', 'Peugeot', 'Mercedes', 'Toyota', 'Daewoo', 'Mini', 'Ford', 'Fiat', 'Sweden'],
    sentencePatterns: ['Nice to meet you.', 'What make is it?', "It's a...", 'This is...'],
    audioSrc: 'audio/lesson-05-06.mp3',
  },
  {
    lessonNumber: 7,
    title: 'Are you a teacher?',
    titleCn: '你是老师吗？',
    group: 'lesson-07-08',
    groupId: 'lesson-07-08',
    stage: 1,
    grammarTopics: ['特殊疑问句', '不定冠词a/an', '职业词汇', 'What疑问句(职业)'],
    vocabularyCount: 20,
    vocabulary: ['name', 'what', 'nationality', 'job', 'keyboard', 'operator', 'engineer', 'policeman', 'policewoman', 'taxi', 'driver', 'air', 'hostess', 'postman', 'nurse', 'mechanic', 'hairdresser', 'housewife', 'milkman'],
    sentencePatterns: ["What's your job?", "I'm a...", 'Are you a...?', "What's your name?"],
    audioSrc: 'audio/lesson-07-08.mp3',
  },
  {
    lessonNumber: 9,
    title: 'How are you today?',
    titleCn: '你今天好吗？',
    group: 'lesson-09-10',
    groupId: 'lesson-09-10',
    stage: 1,
    grammarTopics: ['How问候句型', '形容词作表语', 'Look at祈使句'],
    vocabularyCount: 19,
    vocabulary: ['hello', 'how', 'today', 'well', 'fine', 'thanks', 'goodbye', 'see', 'fat', 'woman', 'thin', 'tall', 'short', 'dirty', 'clean', 'hot', 'cold', 'old', 'young', 'busy', 'lazy'],
    sentencePatterns: ['How are you today?', "I'm very well.", 'Look at that...', "He's busy."],
    audioSrc: 'audio/lesson-09-10.mp3',
  },
  {
    lessonNumber: 11,
    title: 'Is this your shirt?',
    titleCn: '这是你的衬衫吗？',
    group: 'lesson-11-12',
    groupId: 'lesson-11-12',
    stage: 1,
    grammarTopics: ['Whose疑问句', '形容词性物主代词', '名词所有格'],
    vocabularyCount: 13,
    vocabulary: ['whose', 'blue', 'perhaps', 'white', 'catch', 'father', 'mother', 'blouse', 'sister', 'tie', 'brother', 'his', 'her'],
    sentencePatterns: ['Whose is this...?', 'Is this your...?', "This is my father's.", "It's his tie."],
    audioSrc: 'audio/lesson-11-12.mp3',
  },
  {
    lessonNumber: 13,
    title: 'A new dress',
    titleCn: '一件新连衣裙',
    group: 'lesson-13-14',
    groupId: 'lesson-13-14',
    stage: 1,
    grammarTopics: ['What colour疑问句', 'and连接动词', '颜色词汇', '定冠词the'],
    vocabularyCount: 17,
    vocabulary: ['colour', 'green', 'come', 'upstairs', 'smart', 'hat', 'same', 'lovely', 'case', 'carpet', 'dog', 'brown', 'red', 'grey', 'yellow', 'black', 'orange'],
    sentencePatterns: ['What colour is your...?', 'Come upstairs.', "It's the same colour.", 'Come and see it.'],
    audioSrc: 'audio/lesson-13-14.mp3',
  },
  {
    lessonNumber: 15,
    title: 'Your passports, please.',
    titleCn: '请出示你们的护照。',
    group: 'lesson-15-16',
    groupId: 'lesson-15-16',
    stage: 1,
    grammarTopics: ['名词变复数规则', '一般疑问句复数', '国籍询问', 'these/those'],
    vocabularyCount: 17,
    vocabulary: ['customs', 'officer', 'girl', 'Danish', 'friend', 'Norwegian', 'passport', 'tourist', 'Russian', 'Dutch', 'these', 'those'],
    sentencePatterns: ['Your passports, please.', 'Are you...?', 'These are...', 'Those are...'],
    audioSrc: 'audio/lesson-15-16.mp3',
  },
  {
    lessonNumber: 17,
    title: 'How do you do?',
    titleCn: '你好！',
    group: 'lesson-17-18',
    groupId: 'lesson-17-18',
    stage: 1,
    grammarTopics: ['How do you do问候', '名词复数不规则变化', 'Who/What/How区别'],
    vocabularyCount: 14,
    vocabulary: ['employee', 'hard-working', 'sales', 'reps', 'man', 'office', 'assistant', 'those', 'matter', 'children', 'tired', 'thirsty', 'sit', 'down'],
    sentencePatterns: ['How do you do?', 'What are their jobs?', 'Those are...', "They're tired."],
    audioSrc: 'audio/lesson-17-18.mp3',
  },
  {
    lessonNumber: 19,
    title: 'Tired and thirsty.',
    titleCn: '又累又渴。',
    group: 'lesson-19-20',
    groupId: 'lesson-19-20',
    stage: 1,
    grammarTopics: ["What's the matter?", '选择疑问句', '形容词作表语', '人称代词宾格'],
    vocabularyCount: 19,
    vocabulary: ['big', 'small', 'open', 'shut', 'light', 'heavy', 'long', 'shoe', 'grandfather', 'grandmother', 'right', 'ice', 'cream'],
    sentencePatterns: ['Look at them!', "They're...", 'Open the...', 'Shut the...'],
    audioSrc: 'audio/lesson-19-20.mp3',
  },
  {
    lessonNumber: 21,
    title: 'Which book?',
    titleCn: '哪一本书？',
    group: 'lesson-21-22',
    groupId: 'lesson-21-22',
    stage: 1,
    grammarTopics: ['双宾语结构', '人称代词宾格', 'Which疑问句', '不定代词one'],
    vocabularyCount: 17,
    vocabulary: ['give', 'one', 'which', 'empty', 'full', 'large', 'little', 'sharp', 'blunt', 'glass', 'cup', 'bottle', 'tin', 'knife', 'fork', 'spoon'],
    sentencePatterns: ['Which book?', 'Give me a...', 'The one on the...', 'Which one?'],
    audioSrc: 'audio/lesson-21-22.mp3',
  },
  {
    lessonNumber: 23,
    title: 'Which glasses?',
    titleCn: '哪几只杯子？',
    group: 'lesson-23-24',
    groupId: 'lesson-23-24',
    stage: 1,
    grammarTopics: ['双宾语复数形式', '指示代词复数', '不定代词ones', '介词on', 'some用法'],
    vocabularyCount: 16,
    vocabulary: ['some', 'glasses', 'shelf', 'desk', 'table', 'plate', 'cupboard', 'cigarette', 'television', 'floor', 'dressing', 'bed', 'newspaper', 'magazine', 'stereo'],
    sentencePatterns: ['Which glasses?', 'Give me some...', 'The ones on the...', 'The ones on the shelf.'],
    audioSrc: 'audio/lesson-23-24.mp3',
  },
];

export const LESSON_GROUPS = LESSONS.map(l => l.group).filter(
  (v, i, a) => a.indexOf(v) === i
);

export function getLessonByNumber(num: number): LessonMeta | undefined {
  return LESSONS.find(l => l.lessonNumber === num);
}

export function getLessonsByGroup(group: string): LessonMeta[] {
  return LESSONS.filter(l => l.group === group);
}

export function getAllGrammarTopics(): string[] {
  const topics = new Set<string>();
  LESSONS.forEach(l => l.grammarTopics.forEach(t => topics.add(t)));
  return Array.from(topics);
}
