import React, { Component } from 'react';
import { ID } from '../model/base/buildings';
import { Build as BuildIcon } from './Icon';
import ButtonGroup from '../widgets/ButtonGroup';
import { extend, sortBy, resSum, map } from '../utils';

function totalDef(state) {
    const total = {
        def: 10,
        defBonus: 1
    };
    for (let key in state) {
        const { building, level } = state[key];
        const { def = 0, defBonus = 0 } = building.benefit(level);
        total.def += def;
        total.defBonus += defBonus;
    }
    return Math.round(total.def * total.defBonus);
}

function incBuildLevel({ state, cost }, type) {
    const { building, level } = state[type];
    const nextLevel = level + 1;
    const nextState = extend(state, { [type]: { level: nextLevel } });
    if (nextLevel > building.maxLevel) return null;
    return {
        state: nextState,
        cost: cost + resSum(building.cost(nextLevel)),
        def: totalDef(nextState)
    };
}

function getNext(current) {
    const { cost, def } = current;
    const nextStates = Object.keys(current.state)
        .map(key => incBuildLevel(current, key))
        .filter(Boolean);
    sortBy(nextStates, next => (next.def - def) / (next.cost - cost));
    return nextStates.slice(-1)[0];
}

function getInitial(buildings) {
    const state = map(buildings, building => ({ building, level: 0 }));
    return { state, cost: 0, def: totalDef(state) };
}

function getOrder(buildings) {
    let current = getInitial(buildings);
    const order = [current];
    while (current = getNext(current)) {
        order.push(current);
    }
    return order;
}

const propLevels = state =>
    Object.keys(state)
        .map(key => state[key].level)
        .join('_');

export default ({ model, lang }) => {
    const walls = [];
    const bases = [];
    const ditch = [];
    model.buildings.forEach(building => {
        const bonus = building.benefit(0);
        if (typeof bonus !== 'object') return;
        if ('defBonus' in bonus) {
            if (building.r && building.r.r) {
                walls.push(building);
            } else if (building.s === 41) {
                ditch.push(building);
            }
        } else if ('def' in bonus) {
            bases.push(building);
        }
    });
    return class extends Component {
        constructor() {
            super();
            this.state = {
                base: bases[0].id,
                wall: walls[0].id
            };
            if (ditch.length) {
                this.state.ditch = ditch[0].id
            }
        }
        setStateKey(key, value) {
            this.setState(extend(this.state, { [key]: value }));
        }
        render() {
            return <div>
                <ButtonGroup
                    key="base"
                    value={this.state.base}
                    onChange={value => this.setStateKey('base', +value)}
                    buttons={bases.map(building => ({
                        content: <BuildIcon id={building.id} />,
                        value: building.id
                    }))} 
                />
                <ButtonGroup
                    key="wall"
                    value={this.state.wall}
                    onChange={value => this.setStateKey('wall', +value)}
                    buttons={walls.map(building => ({
                        content: <BuildIcon id={building.id} />,
                        value: building.id
                    }))}
                />
                {getOrder(map(this.state, id => model.buildings[id]))
                    .map(({ state }) => <div key={propLevels(state)}>
                        {Object.keys(state).map(key => <span key={key}>
                            <BuildIcon id={state[key].building.id} />
                            {state[key].level}
                        </span>)}
                    </div>)}
            </div>;
        }
    }
}