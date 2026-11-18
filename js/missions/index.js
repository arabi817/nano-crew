// 미션 목록. 새 미션은 파일을 만들고 여기에 한 줄 추가하면 돼요.
import { CONTENT } from '../../data/content.js';
import * as heartWiring from './heartWiring.js';
import * as alveoliFilter from './alveoliFilter.js';

const M = CONTENT.missions;
const def = (key, mod) => ({ title: M[key].title, sub: M[key].guide, unit: M[key].unit, mount: (el, api) => mod.mount(el, api, M[key]) });

export const MISSIONS = {
  heartWiring: def('heartWiring', heartWiring),
  alveoliFilter: def('alveoliFilter', alveoliFilter),
};

// 1단계 시험용: 모두에게 이 두 미션을 줘요 (2단계에서 호스트가 나눠 주도록 바뀜)
export const STAGE1_TASKS = ['heartWiring', 'alveoliFilter'];
