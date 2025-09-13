const loadYamlFile = require('./index');
const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;

const tests = [
  {
    desc: 'Test with context, and ref file has ref property',
    input: {
      filepath: './test2.yml',
      workdir: './test/v2',
      context: {
        './test1.yml': {
          user: {
            name: 'Bob',
            city: 'Beijing',
            country: 'China',
          },
        },
      },
    },
    expected: {
      name: 'Bob',
      address: { city: 'Beijing', country: 'China' },
    },
  },
  {
    desc: 'Test without context, but ref file has ref property',
    input: {
      filepath: './test3.yml',
      workdir: './test/v2',
    },
    expected: {
      name: 'Alice',
      city: 'Beijing',
    },
  },
  {
    desc: 'Test without context, and ref file has no ref property',
    input: {
      filepath: './test6.yml',
      workdir: './test/v2',
    },
    expected: {
      name: 'Tom',
      age: 18,
    },
  },
  {
    desc: 'Test with json pointer and ref property',
    input: {
      filepath: './test7.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: { value: 'alice@example.com', type: 'work' }
      }
    }
  },
  {
    desc: 'Test with ejs template',
    input: {
      filepath: './test8.yml',
      workdir: './test/v2',
      context: {
        user: {
          name: 'Bob',
          address: {
            city: 'Beijing',
            country: 'China',
          },
        },
      },
    },
    expected: {
      name: 'Bob',
      address: { city: 'Beijing', country: 'China' },
    },
  },
  {
    desc: 'Test with refkey and key ',
    input: {
      filepath: './test9.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: { value: 'alice@example.com', type: 'work', name: 'Bob' }
      }
    },
  },
  {
    desc: 'Test with refkey and key ',
    input: {
      filepath: './test10.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: {
          name: 'Bob',
          address: { city: 'Beijing', country: 'China' }, hello: 'world'
        }
      }
    },
  },
  {
    desc: 'Test with ancher ',
    input: {
      filepath: './test11.yml',
      workdir: './test/v2',
    },
    expected: {
      "other": {
        "name": {
          "name": "Alice"
        }
      },
      "parent": {
        "child1": {
          "name": "Alice"
        },
        "child2": {
          "name": "Bob"
        },
        "child3": {
          "name": "Charlie"
        }
      }
    },
  },
  {
    desc: 'Test with $p_ref and ejs ',
    input: {
      filepath: './test12.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: {
          name: 'Bob',city: 'Beijing', country: 'China' , other_key: "other_value", hello: 'world'
        }
      }
    },
  },
  {
    desc: 'Test with $p_ref and ejs and deep obj',
    input: {
      filepath: './test13.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: {
          name: {
            firstName: 'Bob',
            lastName: 'Tom'
          },city: 'Beijing', country: 'China' , hello: 'world'
        }
      }
    },
  },
  // {
  //   desc: 'Test with $p_ref and ejs and deep obj and ejs template',
  //   input: {
  //     filepath: './test14.yml',
  //     workdir: './test/v2',
  //   },
  //   expected: {
  //     person: {
  //       name: 'Alice',
  //       address: { city: 'Beijing', country: 'China' },
  //       contact: {
  //         name: {
  //           firstName: 'Bob',
  //           lastName: 'Tom'
  //         },city: 'Beijing', country: 'China' , hello: 'world'
  //       }
  //     }
  //   },
  // },
  {
    desc: 'Test with $p_ref and ejs twice and deep obj',
    input: {
      filepath: './test15.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: [{
          name: {
            firstName: 'Bob',
            lastName: 'Tom'
          },city: 'Beijing', country: 'China' , hello: 'world'
        },{
          name: {
            firstName: 'Bob',
            lastName: 'Tom'
          },city: 'Beijing', country: 'China' , hello: 'world'
        }]
      }
    },
  },
  {
    desc: 'Test with $p_ref params contains $p_ref ',
    input: {
      filepath: './test16.yml',
      workdir: './test/v2',
    },
    expected: {
      person: {
        name: 'Alice',
        address: { city: 'Beijing', country: 'China' },
        contact: {
          hello: 'world',
          hellos: [
            "world", "earth"
          ],
          other_key: 'other_value',
        }
      }
    },
  },
  {
    desc: 'Test with $p_ref returning array',
    input: {
      filepath: './test17.yml',
      workdir: './test/v2',
    },
    expected: {
        "person": {
            "name": "John Doe",
            "age": 30,
            "hobbies": [
                "swimming",
                "hiking"
            ]
        },
        "people": [
            {
                "name": "Alice",
                "age": 25,
                "hobbies": [
                    "reading",
                    "cooking"
                ]
            },
            {
                "name": "Bob",
                "age": 35,
                "hobbies": [
                    "cycling",
                    "camping"
                ]
            }
        ]
    }
  },
  {
    desc: 'Test with $p_ref returning array',
    input: {
      filepath: './test18.yml',
      workdir: './test/v2',
    },
    expected: [
      {
        "name": "Alice",
        "age": 20
      },
      {
        "name": "Bob",
        "age": 25
      },
      [
        {
          "name": "Cindy",
          "age": 30
        },
        [
          {
            "name": "Eric",
            "age": 40
          },
          {
            "name": "Fiona",
            "age": 45
          }
        ],
        [
          {
            "name": "Eric",
            "age": 40
          },
          {
            "name": "Fiona",
            "age": 45
          }
        ]
      ]
    ]
  },
  {
    desc: 'Test with $flaten flaten array',
    input: {
      filepath: './test19.yml',
      workdir: './test/v2',
    },
    expected: {
      "a": [
        {
          "name": "Bob"
        },
        {
          "name": "Alice"
        },
        {
          "name": "Bob"
        },
        {
          "name": "Alice"
        }
      ],
      "b": [
        {
          "name": "Bob"
        },
        {
          "name": "Alice"
        }
      ]
    }
  }
];

(async () => {
  // console.log()
  const report = {
    all: 0,
    passed: 0,
    failed: 0,
    failed_cases:[

    ]
  }
  for (const { desc, input, expected } of tests) {
    console.log(`Testing: ${desc}`);
    report.all++;
    try {
      // console.log(JSON.stringify(expected))
      // console.log(input)

      const result = await loadYamlFile(path.join(input.workdir, input.filepath), input.workdir, input.context);
      console.log(JSON.stringify(result))
      assert.deepStrictEqual(result, expected);
      console.log('PASS');
      report.passed++;

    } catch (err) {
      console.error(`FAIL: ${err.message}`);
      report.failed++;
      report.failed_cases.push(desc);
    } finally {
      // Remove temporary directory
      // await fs.rm(tempdir, { recursive: true });
    }
  }
  console.log(`All: ${report.all}, Passed: ${report.passed}, Failed: ${report.failed}, Failed Cases:\n${report.failed_cases.join('\n')}`);
})();
