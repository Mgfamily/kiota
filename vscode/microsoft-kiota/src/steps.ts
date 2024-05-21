import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, QuickInputButtons, workspace, l10n, Uri } from 'vscode';
import { allGenerationLanguages, generationLanguageToString, KiotaSearchResultItem, LanguagesInformation, maturityLevelToString } from './kiotaInterop';
import { kiotaLockFile } from './constants';


export async function openSteps() {
    const state = {} as Partial<OpenState>;
    const title = l10n.t('Open an API description');
    let step = 1;
    let totalSteps = 1;
    async function inputPathOrUrl(input: MultiStepInput, state: Partial<OpenState>) {
        state.descriptionPath = await input.showInputBox({
            title,
            step: step++,
            totalSteps: totalSteps,
            value: state.descriptionPath || '',
            prompt: l10n.t('A path or url to an OpenAPI description'),
            validate: validateIsNotEmpty,
            shouldResume: shouldResume
        });
    }
    await MultiStepInput.run(input => inputPathOrUrl(input, state), () => step-=2);
    return state;
};

export async function openManifestSteps() {
    const state = {} as Partial<OpenManifestState>;
    const title = l10n.t('Open an API manifest');
    let step = 1;
    let totalSteps = 1;
    async function inputPathOrUrl(input: MultiStepInput, state: Partial<OpenManifestState>) {
        state.manifestPath = await input.showInputBox({
            title,
            step: step++,
            totalSteps: totalSteps,
            value: state.manifestPath || '',
            prompt: l10n.t('A path or URL to an API manifest'),
            validate: validateIsNotEmpty,
            shouldResume: shouldResume
        });
    }
    await MultiStepInput.run(input => inputPathOrUrl(input, state), () => step-=2);
    return state;
};

export async function selectApiManifestKey(keys: string[]) {
    const state = {} as Partial<SelectApiManifestKey>;
    let step = 1;
    let totalSteps = 1;
    const title = l10n.t('Select an API manifest key');
    async function pickSearchResult(input: MultiStepInput, state: Partial<SelectApiManifestKey>) {
        const items = keys.map(x => 
        { 
            return {
                label: x,
            } as QuickPickItem;
        });
        const pick = await input.showQuickPick({
            title,
            step: step++,
            totalSteps: totalSteps,
            placeholder: l10n.t('Select an API manifest key'),
            items: items,
            shouldResume: shouldResume
        });
        state.selectedKey = keys.find(x => x === pick?.label);
    }
    await MultiStepInput.run(input => pickSearchResult(input, state), () => step-=2);
    return state;
}

export async function searchLockSteps() {
    const state = {} as Partial<SearchLockState>;
    let step = 1;
    let totalSteps = 1;
    const title = l10n.t('Open a lock file');
    async function pickSearchResult(input: MultiStepInput, state: Partial<SearchLockState>) {
        const searchResults = await workspace.findFiles(`**/${kiotaLockFile}`);
        const items = searchResults.map(x => 
        { 
            return {
                label: x.path.replace(workspace.getWorkspaceFolder(x)?.uri.path || '', ''),
            } as QuickPickItem;
        });
        const pick = await input.showQuickPick({
            title,
            step: step++,
            totalSteps: totalSteps,
            placeholder: l10n.t('Pick a workspace file'),
            items: items,
            shouldResume: shouldResume
        });
        state.lockFilePath = searchResults.find(x => x.path.replace(workspace.getWorkspaceFolder(x)?.uri.path || '', '') === pick?.label);
    }
    await MultiStepInput.run(input => pickSearchResult(input, state), () => step-=2);
    return state;
}

export async function filterSteps(existingFilter: string, filterCallback: (searchQuery: string) => void) {
    const state = {} as Partial<BaseStepsState>;
    const title = l10n.t('Filter the API description');
    let step = 1;
    let totalSteps = 1;
    async function inputFilterQuery(input: MultiStepInput, state: Partial<BaseStepsState>) {
        await input.showInputBox({
            title,
            step: step++,
            totalSteps: totalSteps,
            value: existingFilter,
            prompt: l10n.t('Enter a filter'),
            validate: x => {
                filterCallback(x.length === 0 && existingFilter.length > 0 ? existingFilter : x);
                existingFilter = '';
                return Promise.resolve(undefined);
            },
            shouldResume: shouldResume
        });
    }
    await MultiStepInput.run(input => inputFilterQuery(input, state), () => step-=2);
    return state;
}

export async function searchSteps(searchCallBack: (searchQuery: string) => Thenable<Record<string, KiotaSearchResultItem> | undefined>) {
    const state: Partial<SearchState & OpenState> = {};
    const title = l10n.t('Add an API description');
    let step = 1;
    let totalSteps = 2;
    async function inputPathOrSearch(input: MultiStepInput, state: Partial<SearchState & OpenState>) {
        state.searchQuery = await input.showInputBox({
            title,
            step: step++,
            totalSteps: totalSteps,
            value: state.searchQuery || '',
            prompt: l10n.t('Search or paste a path to an API description'),
            validate: validateIsNotEmpty,
            shouldResume: shouldResume
        });

        state.searchResults = await searchCallBack(state.searchQuery);
        if(state.searchResults && Object.keys(state.searchResults).length > 0) {
            return (input: MultiStepInput) => pickSearchResult(input, state);
        }
        else {
            state.descriptionPath = state.searchQuery;
            return (input: MultiStepInput) => inputPathOrUrl(input, state);
        }
    }

    async function inputPathOrUrl(input: MultiStepInput, state: Partial<OpenState>) {
       if (state.descriptionPath) {
        return;
       }
       state.descriptionPath = await input.showInputBox({
        title,
        step: step++,
        totalSteps: 1,
        value: state.descriptionPath || '',
        prompt: l10n.t('Search or paste a path to an API description'),
        validate: validateIsNotEmpty,
        shouldResume: shouldResume
    });
    }
    async function pickSearchResult(input: MultiStepInput, state: Partial<SearchState & OpenState>) {
        const items: QuickSearchPickItem[] = [];
        if(state.searchResults) {
            for (const key of Object.keys(state.searchResults)) {
                const value = state.searchResults[key];
                items.push({label: key, description: value.Description, descriptionUrl: value.DescriptionUrl});
            }
        }
        const pick = await input.showQuickPick({
            title,
            step: step++,
            totalSteps: totalSteps,
            placeholder: l10n.t('Pick a search result'),
            items: items,
            shouldResume: shouldResume
        });
        state.descriptionPath = items.find(x => x.label === pick?.label)?.descriptionUrl || '';
    }
    await MultiStepInput.run(input => inputPathOrSearch(input, state), () => step-=2);
    return state;
}

interface SearchItem {
    descriptionUrl?: string;
}
type QuickSearchPickItem = QuickPickItem & SearchItem;

export async function generateSteps(existingConfiguration: Partial<GenerateState>, languagesInformation?: LanguagesInformation) {
    const state = {...existingConfiguration} as Partial<GenerateState>;
    if (existingConfiguration.generationType && existingConfiguration.clientClassName && existingConfiguration.clientNamespaceName && existingConfiguration.outputPath && existingConfiguration.language &&
        typeof existingConfiguration.generationType === 'string' && existingConfiguration.clientNamespaceName === 'string' && typeof existingConfiguration.outputPath === 'string' && typeof existingConfiguration.language === 'string' &&
        existingConfiguration.generationType.length > 0 && existingConfiguration.clientClassName.length > 0 && existingConfiguration.clientNamespaceName.length > 0 && existingConfiguration.outputPath.length > 0 && existingConfiguration.language.length > 0) {
        return state;
    }

    if(typeof state.outputPath === 'string') {
        state.outputPath = workspace.asRelativePath(state.outputPath);
    }
    let step = 1;
    let totalSteps = 4;
    async function inputGenerationType(input: MultiStepInput, state: Partial<GenerateState>) {
        const items = [l10n.t('Generate an API client'), l10n.t('Generate a plugin'), l10n.t('Generate an API manifest')];
		const option = await input.showQuickPick({
			title: l10n.t('What do you want to generate?'),
			step: 1,
			totalSteps: 1,
            placeholder: l10n.t('Select an option'),
			items: items.map(x => ({label: x})),
			validate: validateIsNotEmpty,
			shouldResume: shouldResume
		});
        if(option.label === l10n.t('Generate an API client')) {
            state.generationType = "client";
		    return (input: MultiStepInput) => inputClientClassName(input, state);
        }
        else if(option.label === l10n.t('Generate a plugin')) { 
            state.generationType = "plugin";
            return (input: MultiStepInput) => inputPluginName(input, state); 
        }
        else if(option.label === l10n.t('Generate an API manifest')) {
            state.generationType = "apimanifest";
            return (input: MultiStepInput) => inputManifestName(input, state);
        }
	}
    async function inputClientClassName(input: MultiStepInput, state: Partial<GenerateState>) {
		state.clientClassName = await input.showInputBox({
			title: `${l10n.t('Create a new API client')} - ${l10n.t('class')}`,
			step: step++,
			totalSteps: totalSteps,
			value: state.clientClassName || '',
            placeholder: 'ApiClient',
			prompt: l10n.t('Choose a name for the client class'),
			validate: validateIsNotEmpty,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => inputClientNamespaceName(input, state);
	}
    async function inputClientNamespaceName(input: MultiStepInput, state: Partial<GenerateState>) {
		state.clientNamespaceName = await input.showInputBox({
			title: `${l10n.t('Create a new API client')} - ${l10n.t('namespace')}`,
			step: step++,
			totalSteps: totalSteps,
			value: typeof state.clientNamespaceName === 'string' ? state.clientNamespaceName : '',
			placeholder: 'ApiSDK',
			prompt: l10n.t('Choose a name for the client class namespace'),
			validate: validateIsNotEmpty,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => inputOutputPath(input, state);
	}
    async function inputOutputPath(input: MultiStepInput, state: Partial<GenerateState>) {
		state.outputPath = await input.showInputBox({
			title: `${l10n.t('Create a new API client')} - ${l10n.t('output path')}`,
			step: step++,
			totalSteps: totalSteps,
			value: typeof state.outputPath === 'string' ? state.outputPath : '',
			placeholder: 'myproject/apiclient',
			prompt: l10n.t('Enter an output path relative to the root of the project'),
			shouldResume: shouldResume
		});
        state.outputPath === '' ? state.outputPath = 'output' : state.outputPath;	
		return (input: MultiStepInput) => pickLanguage(input, state);
	}
    async function pickLanguage(input: MultiStepInput, state: Partial<GenerateState>) {
        const items = allGenerationLanguages.map(x => {
            const lngName = generationLanguageToString(x);
            const lngInfo = languagesInformation ? languagesInformation[lngName] : undefined;
            const lngMaturity = lngInfo ? ` - ${maturityLevelToString(lngInfo.MaturityLevel)}` : '';
            return {
                label: `${lngName}${lngMaturity}`,
                languageName: lngName,
            } as (QuickPickItem & {languageName: string});
        });
		const pick = await input.showQuickPick({
			title: `${l10n.t('Create a new API client')} - ${l10n.t('language')}`,
			step: step++,
			totalSteps: totalSteps,
			placeholder: l10n.t('Pick a language'),
			items,
			activeItem: typeof state.language === 'string' ? items.find(x => x.languageName === state.language) : undefined,
			shouldResume: shouldResume
		});
		state.language = pick.label.split('-')[0].trim();
	}
    async function inputPluginName(input:MultiStepInput, state: Partial<GenerateState>) {
        state.pluginName = await input.showInputBox({
            title: `${l10n.t('Create a new plugin')} - ${('plugin name')}`,
            step: step++,
            totalSteps: 3,
            value: state.pluginName || '',
            placeholder: 'MyPlugin',
            prompt: l10n.t('Choose a name for the plugin'),
            validate: validateIsNotEmpty,
            shouldResume: shouldResume
        });
        return (input: MultiStepInput) => inputPluginType(input, state);      
    }    
        async function inputPluginType(input: MultiStepInput, state: Partial<GenerateState>) {
            const items = ['Microsoft','Open AI'].map(x => ({ label: x})as QuickPickItem);
            const pluginTypes = await input.showQuickPick({
                title: 'Choose a plugin type',
                step: step++,
                totalSteps: 3,
                placeholder: 'Select an option',
                items: items,
                validate: validateIsNotEmpty,
                shouldResume: shouldResume
            });
            pluginTypes.label === 'Microsoft'? state.pluginTypes = 'Microsoft' : state.pluginTypes = 'OpenAI';
            return (input: MultiStepInput) => inputPluginOutputPath(input, state);
        }
    async function inputPluginOutputPath(input: MultiStepInput, state: Partial<GenerateState>) {
		state.outputPath = await input.showInputBox({
			title: `${l10n.t('Create a new plugin')} - ${('output path')}}`,
			step: step++,
			totalSteps: 3,
			value: typeof state.outputPath === 'string' ? state.outputPath : '',
			placeholder: 'myproject/myplugin',
			prompt: l10n.t('Enter an output path relative to the root of the project'),
			shouldResume: shouldResume
		});
        state.outputPath === ''? state.outputPath = 'output' : state.outputPath;		
	}
    async function inputManifestName(input:MultiStepInput, state: Partial<GenerateState>) {
        state.pluginName = await input.showInputBox({
            title: `${l10n.t('Create a new manifest')} - ${('manifest name')}`,
            step: step++,
            totalSteps: 3,
            value: state.pluginName || '',
            placeholder: 'MyManifest',
            prompt: l10n.t('Choose a name for the manifest'),
            validate: validateIsNotEmpty,
            shouldResume: shouldResume
        });
        return (input: MultiStepInput) => inputManifestOutputPath(input, state);      
    }
    async function inputManifestOutputPath(input: MultiStepInput, state: Partial<GenerateState>) {
		state.outputPath = await input.showInputBox({
			title: `${l10n.t('Create a new manifest')} - ${('output path')}`,
			step: step++,
			totalSteps: 3,
			value: typeof state.outputPath === 'string' ? state.outputPath : '',
			placeholder: 'myproject/mymanifest',
			prompt: l10n.t('Enter an output path relative to the root of the project'),
			shouldResume: shouldResume
		});	
        state.outputPath === ''? state.outputPath = 'output' : state.outputPath;		
	}
    await MultiStepInput.run(input => inputGenerationType(input, state), () => step-=2);
    return state;
}

function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((resolve, reject) => {
        // noop
    });
}

function validateIsNotEmpty(value: string) {
    return Promise.resolve(value.length > 0 ? undefined : l10n.t('Required'));
}

interface BaseStepsState {
    title: string;
    step: number;
    totalSteps: number;
}

interface SearchState extends BaseStepsState {
    searchQuery: string;
    searchResults: Record<string, KiotaSearchResultItem>;
    descriptionPath: string;
}

interface OpenState extends BaseStepsState {
    descriptionPath: string;
}

interface OpenManifestState extends BaseStepsState {
    manifestPath: string;
}

interface SearchLockState extends BaseStepsState {
    lockFilePath: Uri;
}

interface SelectApiManifestKey extends BaseStepsState {
    selectedKey: string;
}

export interface GenerateState extends BaseStepsState {
    generationType: QuickPickItem | string;
    pluginTypes: QuickPickItem | string;
    pluginName:string;
    clientClassName: string;
    clientNamespaceName: QuickPickItem | string;
    language: QuickPickItem | string;
    outputPath: QuickPickItem | string;
}
export enum GenerationType {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Client = 0,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Plugin = 1,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ApiManifest = 2,
}
export function parseGenerationType(generationType: string | QuickPickItem | undefined): GenerationType {
    if(typeof generationType !== 'string') {
        throw new Error('generationType has not been selected yet');
    }
    switch(generationType) {
        case "client":
            return GenerationType.Client;
        case "plugin":
            return GenerationType.Plugin;
        case "apimanifest":
            return GenerationType.ApiManifest;
        default:
            throw new Error(`Unknown generation type ${generationType}`);
    }
}
class InputFlowAction {
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}
type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	ignoreFocusOut?: boolean;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate?: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	ignoreFocusOut?: boolean;
	placeholder?: string;
	shouldResume: () => Thenable<boolean>;
}


class MultiStepInput {

	static async run<T>(start: InputStep, onNavBack?: () => void) {
		const input = new MultiStepInput();
		return input.stepThrough(start, onNavBack);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep, onNavBack?: () => void) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
                    if (onNavBack) {
                        onNavBack();
                    }
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, ignoreFocusOut, placeholder, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.ignoreFocusOut = ignoreFocusOut ?? false;
				input.placeholder = placeholder;
				input.items = items;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
                if (activeItem) {
					input.activeItems = [activeItem];
				}
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, ignoreFocusOut, placeholder, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.ignoreFocusOut = ignoreFocusOut ?? false;
				input.placeholder = placeholder;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				let validating = validate ? validate(''): Promise.resolve(undefined);
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(validate && await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async text => {
                        if(validate){
                            const current = validate(text);
						    validating = current;
						    const validationMessage = await current;
						    if (current === validating) {
							    input.validationMessage = validationMessage;
						    }
                        }						
					}),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}
}