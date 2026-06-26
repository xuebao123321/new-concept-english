// 新概念英语第一册 1-24课 语法知识点定义

export interface GrammarPoint {
  id: string;
  name: string;           // 语法点名称
  nameCn: string;         // 中文名称
  lessonGroup: string;    // 首次出现的课文组
  description: string;    // 简要说明
  examples: string[];     // 例句
  relatedPoints: string[];// 关联语法点ID
}

export const GRAMMAR_POINTS: GrammarPoint[] = [
  {
    id: 'be-questions',
    name: 'Be Verb Questions',
    nameCn: 'be动词一般疑问句',
    lessonGroup: 'lesson-01-02',
    description: '将be动词(is/am/are)提到句首构成一般疑问句，肯定回答用"Yes, 主语+be"',
    examples: [
      'Is this your handbag? — Yes, it is.',
      'Is this your pen? — Yes, it is.',
    ],
    relatedPoints: ['be-negative', 'subject-complement'],
  },
  {
    id: 'subject-complement',
    name: 'Subject-Complement Structure',
    nameCn: '主系表结构',
    lessonGroup: 'lesson-01-02',
    description: '以this/that/人称代词作主语，be动词作系词，名词作表语的基本句型',
    examples: [
      'This is my book.',
      'She is a teacher.',
    ],
    relatedPoints: ['be-questions', 'be-negative'],
  },
  {
    id: 'excuse-me',
    name: 'Excuse me vs Sorry',
    nameCn: 'Excuse me与Sorry的区别',
    lessonGroup: 'lesson-01-02',
    description: 'Excuse me用于引起注意或打断他人，Sorry用于道歉',
    examples: [
      'Excuse me! Is this your handbag?',
      'Sorry, sir.',
    ],
    relatedPoints: [],
  },
  {
    id: 'be-negative',
    name: 'Negative Sentences',
    nameCn: '否定句',
    lessonGroup: 'lesson-03-04',
    description: '在be动词后加not构成否定句',
    examples: [
      'This is not my umbrella.',
      'She is not French.',
    ],
    relatedPoints: ['be-questions', 'subject-complement'],
  },
  {
    id: 'imperative',
    name: 'Imperative Sentences',
    nameCn: '祈使句',
    lessonGroup: 'lesson-03-04',
    description: '以动词原形开头或名词+please表达请求/命令',
    examples: [
      'My coat, please.',
      'Come upstairs and see it.',
    ],
    relatedPoints: [],
  },
  {
    id: 'here-is',
    name: 'Here is... Structure',
    nameCn: 'Here is...句型',
    lessonGroup: 'lesson-03-04',
    description: '把东西递给别人或指给别人看时使用',
    examples: [
      'Here is my ticket.',
      'Here is your umbrella.',
    ],
    relatedPoints: ['subject-complement'],
  },
  {
    id: 'third-person-be',
    name: 'Third Person with Be',
    nameCn: '第三人称单数主系表',
    lessonGroup: 'lesson-05-06',
    description: '主语为第三人称单数(he/she/it)时，be动词用is',
    examples: [
      'She is French.',
      'He is German.',
      'It is a Volvo.',
    ],
    relatedPoints: ['subject-complement', 'nationalities'],
  },
  {
    id: 'nationalities',
    name: 'Nationalities',
    nameCn: '国籍表达',
    lessonGroup: 'lesson-05-06',
    description: '用be动词+国籍形容词表达某人的国籍',
    examples: [
      'What nationality are you? — I\'m Chinese.',
      'Are you Swedish? — No, we are Danish.',
    ],
    relatedPoints: ['third-person-be', 'wh-questions'],
  },
  {
    id: 'wh-questions',
    name: 'Wh- Questions',
    nameCn: '特殊疑问句',
    lessonGroup: 'lesson-07-08',
    description: '用What/Who/How/Whose/Which等疑问词引导的问句',
    examples: [
      'What\'s your job?',
      'What nationality are you?',
      'What\'s your name?',
    ],
    relatedPoints: ['articles', 'be-questions'],
  },
  {
    id: 'articles',
    name: 'Articles a/an',
    nameCn: '不定冠词a/an',
    lessonGroup: 'lesson-07-08',
    description: 'a用于辅音音素前，an用于元音音素前，表示"一个"',
    examples: [
      'I am a teacher.',
      'She is an air hostess.',
      'He is an engineer.',
    ],
    relatedPoints: ['wh-questions'],
  },
  {
    id: 'how-greetings',
    name: 'How Greetings',
    nameCn: 'How问候句型',
    lessonGroup: 'lesson-09-10',
    description: '用How are you? / How is...? 问候他人健康状况',
    examples: [
      'How are you today? — I\'m fine, thanks.',
      'How is your mother? — She\'s very well.',
    ],
    relatedPoints: ['adjectives-predicative'],
  },
  {
    id: 'adjectives-predicative',
    name: 'Adjectives as Predicative',
    nameCn: '形容词作表语',
    lessonGroup: 'lesson-09-10',
    description: '形容词放在be动词后作表语，描述主语的特征或状态',
    examples: [
      'He is fat.',
      'She is cold.',
      'Look at that man! He\'s busy.',
    ],
    relatedPoints: ['subject-complement', 'how-greetings'],
  },
  {
    id: 'possessive-adjectives',
    name: 'Possessive Adjectives',
    nameCn: '形容词性物主代词',
    lessonGroup: 'lesson-11-12',
    description: 'my, your, his, her, its, our, their 修饰名词表示所属关系',
    examples: [
      'This is my shirt.',
      'That is her dress.',
    ],
    relatedPoints: ['possessive-s', 'whose-questions'],
  },
  {
    id: 'whose-questions',
    name: 'Whose Questions',
    nameCn: 'Whose引导的特殊疑问句',
    lessonGroup: 'lesson-11-12',
    description: '用Whose询问物品所属',
    examples: [
      'Whose shirt is this? — It\'s my shirt.',
      'Whose is this book? — It\'s Tim\'s.',
    ],
    relatedPoints: ['possessive-adjectives', 'possessive-s'],
  },
  {
    id: 'possessive-s',
    name: 'Possessive \'s',
    nameCn: '名词所有格',
    lessonGroup: 'lesson-11-12',
    description: '在名词后加\'s表示所属关系',
    examples: [
      'It\'s Tim\'s shirt.',
      'This is my father\'s tie.',
    ],
    relatedPoints: ['possessive-adjectives', 'whose-questions'],
  },
  {
    id: 'what-colour',
    name: 'What Colour Questions',
    nameCn: 'What colour疑问句',
    lessonGroup: 'lesson-13-14',
    description: '用What colour询问颜色',
    examples: [
      'What colour\'s your new dress? — It\'s green.',
      'What colour is your hat? — It\'s blue.',
    ],
    relatedPoints: ['wh-questions', 'and-conjunction'],
  },
  {
    id: 'and-conjunction',
    name: 'And Conjunction',
    nameCn: 'and连接动词',
    lessonGroup: 'lesson-13-14',
    description: '用and连接两个并列的动作',
    examples: [
      'Come upstairs and see it.',
      'Come and look at my new dress.',
    ],
    relatedPoints: ['imperative'],
  },
  {
    id: 'plural-nouns',
    name: 'Plural Nouns',
    nameCn: '名词变复数规则',
    lessonGroup: 'lesson-15-16',
    description: '名词变复数的规则：+s, +es, y→ies, f→ves, 不规则变化',
    examples: [
      'book → books',
      'watch → watches',
      'family → families',
      'knife → knives',
      'man → men',
    ],
    relatedPoints: ['be-questions-plural', 'demonstrative-plural'],
  },
  {
    id: 'be-questions-plural',
    name: 'Be Questions Plural',
    nameCn: '一般疑问句复数形式',
    lessonGroup: 'lesson-15-16',
    description: '用Are these/those...?询问复数物品',
    examples: [
      'Are these your books? — Yes, they are.',
      'Are those your pens? — No, they aren\'t.',
    ],
    relatedPoints: ['plural-nouns', 'be-questions'],
  },
  {
    id: 'demonstrative-plural',
    name: 'Demonstrative Pronouns Plural',
    nameCn: '指示代词复数',
    lessonGroup: 'lesson-23-24',
    description: 'this→these, that→those 表示复数',
    examples: [
      'This book → These books',
      'That glass → Those glasses',
    ],
    relatedPoints: ['plural-nouns', 'ones-pronoun'],
  },
  {
    id: 'irregular-plurals',
    name: 'Irregular Plurals',
    nameCn: '名词复数不规则变化',
    lessonGroup: 'lesson-17-18',
    description: '常见不规则名词复数：man→men, woman→women, child→children等',
    examples: [
      'man → men',
      'woman → women',
      'policeman → policemen',
      'child → children',
    ],
    relatedPoints: ['plural-nouns'],
  },
  {
    id: 'who-what-how',
    name: 'Who/What/How Distinction',
    nameCn: 'Who/What/How区别',
    lessonGroup: 'lesson-17-18',
    description: 'Who问姓名/身份，What问职业，How问状态',
    examples: [
      'Who is this? — This is Jim.',
      'What are their jobs? — They are milkmen.',
      'How is your father? — He\'s fine.',
    ],
    relatedPoints: ['wh-questions'],
  },
  {
    id: 'whats-matter',
    name: "What's the matter?",
    nameCn: '询问状况句型',
    lessonGroup: 'lesson-19-20',
    description: '用What\'s the matter?询问发生了什么/怎么了',
    examples: [
      'What\'s the matter with you? — I\'m tired and thirsty.',
      'What\'s the matter? — I have a headache.',
    ],
    relatedPoints: ['wh-questions', 'choice-questions'],
  },
  {
    id: 'choice-questions',
    name: 'Alternative Questions',
    nameCn: '选择疑问句',
    lessonGroup: 'lesson-19-20',
    description: '用or连接两个选项，不用yes/no回答',
    examples: [
      'Are his shoes dirty or clean? — They\'re not dirty. They\'re clean.',
      'Is she tall or short? — She\'s tall.',
    ],
    relatedPoints: ['be-questions'],
  },
  {
    id: 'double-object',
    name: 'Double Object Structure',
    nameCn: '双宾语结构',
    lessonGroup: 'lesson-21-22',
    description: 'Give/Show/Send + 人(间接宾语) + 物(直接宾语)',
    examples: [
      'Give me a book, please.',
      'Give him two oranges.',
      'Show her your new dress.',
    ],
    relatedPoints: ['object-pronouns', 'which-questions'],
  },
  {
    id: 'object-pronouns',
    name: 'Object Pronouns',
    nameCn: '人称代词宾格',
    lessonGroup: 'lesson-21-22',
    description: 'me, you, him, her, it, us, you, them — 用于动词或介词后',
    examples: [
      'Give me a pen. (I→me)',
      'Look at him. (he→him)',
      'Tell her the answer. (she→her)',
    ],
    relatedPoints: ['double-object'],
  },
  {
    id: 'which-questions',
    name: 'Which Questions',
    nameCn: 'Which引导的特殊疑问句',
    lessonGroup: 'lesson-21-22',
    description: '用Which从多个选项中指定某一个',
    examples: [
      'Which book? — The red one.',
      'Which ones? — The ones on the shelf.',
    ],
    relatedPoints: ['one-pronoun', 'ones-pronoun'],
  },
  {
    id: 'one-pronoun',
    name: 'Pronoun "one"',
    nameCn: '不定代词one',
    lessonGroup: 'lesson-21-22',
    description: 'one代替前面提到的单数可数名词，避免重复',
    examples: [
      'Which book? — The red one.',
      'I don\'t have a pen. Can you give me one?',
    ],
    relatedPoints: ['which-questions', 'ones-pronoun'],
  },
  {
    id: 'ones-pronoun',
    name: 'Pronoun "ones"',
    nameCn: '不定代词ones',
    lessonGroup: 'lesson-23-24',
    description: 'ones代替前面提到的复数名词',
    examples: [
      'Which glasses? — The ones on the shelf.',
      'I like the red ones.',
    ],
    relatedPoints: ['one-pronoun', 'which-questions'],
  },
  {
    id: 'preposition-on',
    name: 'Preposition "on"',
    nameCn: '介词on的用法',
    lessonGroup: 'lesson-23-24',
    description: 'on表示"在...上面"（表面接触）',
    examples: [
      'The ones on the shelf.',
      'The book on the desk.',
      'The magazine on the bed.',
    ],
    relatedPoints: [],
  },
];

export function getGrammarByGroup(group: string): GrammarPoint[] {
  return GRAMMAR_POINTS.filter(g => g.lessonGroup === group);
}

export function getGrammarById(id: string): GrammarPoint | undefined {
  return GRAMMAR_POINTS.find(g => g.id === id);
}

export function getAllGrammarIds(): string[] {
  return GRAMMAR_POINTS.map(g => g.id);
}
