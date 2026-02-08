import React from 'react';
import { Globe } from 'lucide-react';
import { useGameStore, EnvironmentType } from '../../store/gameStore';
import { TacticalButton } from './TacticalButton';

export const EnvironmentToggle: React.FC = () => {
    const { environment, setEnvironment } = useGameStore();

    const toggleEnvironment = () => {
        const envs: EnvironmentType[] = ['countryside', 'city', 'mountain', 'desert', 'beach', 'rainforest'];
        const nextIndex = (envs.indexOf(environment) + 1) % envs.length;
        setEnvironment(envs[nextIndex]);
    };

    return (
        <TacticalButton 
            onClick={toggleEnvironment} 
            icon={Globe} 
            title={`Environment: ${environment}`} 
        />
    );
};
