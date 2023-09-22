import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatesProvider, DateInput } from '@mantine/dates';
import { addDays, format, parse as parseDate } from 'date-fns';
import 'dayjs/locale/ja';

type Milestone = {
  id: string;
  name: string;
  durationDaysFromPreviousOne: number;
};

type State = {
  lineFormat: string;
  startDate: string;
  milestones: Array<Milestone>;
};

function parseYYYYMMDD(date: string): Date {
  return parseDate(date, 'yyyy-MM-dd', new Date());
}

function serializeYYYYMMDD(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function ensureYYYYMMDD(date: string | null): string {
  if (date && /\d{4,}-\d{2}-\d{2}/.test(date)) {
    return date;
  }
  return serializeYYYYMMDD(new Date());
}

function transformToState(params: URLSearchParams): State {
  const milestones: Array<Partial<Milestone>> = [];
  for (const key of params.keys()) {
    const matched = key.match(
      /^milestone\[(?<index>\d+)\]\.(?<name>name|duration)/,
    );
    if (matched) {
      const index = matched.groups?.index
        ? parseInt(matched.groups?.index, 10)
        : null;
      if (index === null) continue;
      const m = milestones[index] ?? { id: index };

      const name = matched.groups?.name;
      if (name === 'name') {
        m.name = params.get(key)!;
      }
      if (name === 'duration') {
        m.durationDaysFromPreviousOne = parseInt(params.get(key)!, 10);
      }

      milestones[index] = m;
    }
  }
  return {
    lineFormat: params.get('lineFormat') ?? '- [ ] {date} {name}',
    startDate: ensureYYYYMMDD(params.get('startDate')),
    milestones: milestones as Array<Milestone>,
  };
}

function transfromToSearchParams(state: State): URLSearchParams {
  const result = new URLSearchParams();
  result.append('lineFormat', state.lineFormat);
  result.append('startDate', state.startDate);
  for (let i = 0; i < state.milestones.length; ++i) {
    const milestone = state.milestones[i];
    result.append(`milestone[${i}].name`, milestone.name);
    result.append(
      `milestone[${i}].duration`,
      milestone.durationDaysFromPreviousOne.toString(10),
    );
  }
  return result;
}

function serializeState(state: State) {
  return state.milestones.reduce(
    (acc, m, i) => {
      const now = addDays(acc.now, i === 0 ? 0 : m.durationDaysFromPreviousOne);
      const line = state.lineFormat
        .replaceAll('{date}', format(now, 'MM/dd'))
        .replaceAll('{name}', m.name);
      return {
        now,
        result: i === 0 ? line : `${acc.result}\n${line}`,
      };
    },
    { now: parseYYYYMMDD(state.startDate), result: '' },
  );
}

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<State>(() =>
    transformToState(searchParams),
  );
  const update = useCallback(
    (nextStateOrUpdater: State | ((prev: State) => State)) => {
      const nextState =
        nextStateOrUpdater instanceof Function
          ? nextStateOrUpdater(state)
          : nextStateOrUpdater;
      setState(nextState);
      setSearchParams(transfromToSearchParams(nextState));
    },
    [setSearchParams, state],
  );

  return (
    <DatesProvider settings={{ locale: 'ja', firstDayOfWeek: 1 }}>
      <div>
        <div>
          <label>
            基準日
            <DateInput
              value={parseYYYYMMDD(state.startDate)}
              valueFormat="YYYY-MM-DD"
              onChange={(startDate) =>
                startDate &&
                update((prev) => ({
                  ...prev,
                  startDate: serializeYYYYMMDD(startDate),
                }))
              }
            />
          </label>
          <button
            type="button"
            onClick={() =>
              update((prev) => ({
                ...prev,
                startDate: serializeYYYYMMDD(new Date()),
              }))
            }
          >
            今日にする
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() =>
              update((prev) => ({
                ...prev,
                milestones: prev.milestones.toSpliced(0, 0, {
                  id:
                    Date.now().toString(16) + '$' + Math.random().toString(16),
                  name: '',
                  durationDaysFromPreviousOne: 0,
                }),
              }))
            }
          >
            先頭に追加
          </button>
        </div>
        {state.milestones.map((m, index) => (
          <div key={m.id}>
            {index > 0 ? (
              <label>
                から
                <input
                  type="number"
                  value={m.durationDaysFromPreviousOne}
                  onChange={(e) =>
                    update((prev) => ({
                      ...prev,
                      milestones: prev.milestones.with(index, {
                        ...m,
                        durationDaysFromPreviousOne: parseInt(
                          e.currentTarget.value,
                          10,
                        ),
                      }),
                    }))
                  }
                ></input>
                日で
              </label>
            ) : null}
            <label>
              <input
                type="text"
                value={m.name}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    milestones: prev.milestones.with(index, {
                      ...m,
                      name: e.currentTarget.value,
                    }),
                  }))
                }
              ></input>
            </label>

            <button
              type="button"
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  milestones: prev.milestones.toSpliced(index, 1),
                }))
              }
            >
              これを削除
            </button>
            <button
              type="button"
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  milestones: prev.milestones.toSpliced(index + 1, 0, {
                    id:
                      Date.now().toString(16) +
                      '$' +
                      Math.random().toString(16),
                    name: '',
                    durationDaysFromPreviousOne: 0,
                  }),
                }))
              }
            >
              次に追加
            </button>
          </div>
        ))}
        <label>
          format:{' '}
          <input
            type="text"
            value={state.lineFormat}
            onChange={(e) =>
              update((prev) => ({ ...prev, lineFormat: e.currentTarget.value }))
            }
          ></input>
        </label>
        <hr />
        <textarea
          style={{ width: '400px', height: '300px' }}
          value={serializeState(state).result}
          readOnly
        ></textarea>
      </div>
    </DatesProvider>
  );
}

export default App;
