import React, { FunctionComponent } from 'react';
import { useState } from "react";
import styles from './VectorFrame.module.css';
import GPTPopup from "./GPTPopup";
import Terminal from "./Terminal";
import Vector72 from "./Vector72";

const VectorFrame: React.FC = () => {
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [showVector72, setShowVector72] = useState<boolean>(false);
  const [showGPT, setShowGPT] = useState<boolean>(false);
   
  return (
        <div className={styles.componentParent}>
            <img className={styles.frameChild} alt="" src="Vector 71.svg" />
            <div className={styles.sATI}>
                <div className={styles.sAT}>{`S A T I `}</div>
            </div>
            <div className={styles.oPTIONS}>
                <div className={styles.sAT}>O P T I O N S</div>
            </div>
            <img className={styles.selectorGroupIcon} alt="" src="Selector Group.svg" />
            <img className={styles.osGroupIcon} alt="" src="OS Group.svg" />
            <img className={styles.sphericalDataIcon} alt="" src="Spherical Data.svg" />
            <img className={styles.osLightsIcon} alt="" src="OS Lights.svg" />
            <div className={styles.cpuPercentageWrapper}>
                <div className={styles.cpuPercentage}>
                    <div className={styles.cpuPercentage1} />
                </div>
            </div>
            <img className={styles.oslContainerIcon} alt="" src="OSL Container.svg" />
            <img className={styles.outputVectorIcon} alt="" src="Output Vector.svg" />
            <img className={styles.frameItem} alt="" src="Group 7.svg" />
            <img className={styles.lower9Icon} alt="" src="Lower 9.svg" />
            <img className={styles.frameInner} alt="" src="Frame 8.svg" />
            <img className={styles.speakerVisualIcon} alt="" src="Speaker Visual.svg" />
            <img className={styles.speakerVectorIcon} alt="" src="Speaker Vector.svg" />
            <img className={styles.prometheusConsoleIcon} alt="" src="Prometheus Console.svg" />
            <div className={styles.audioVector}>
                <img className={styles.audioVectorIcon} alt="" src="Audio Vector.svg" />
                <div className={styles.uploadedConsole}>
                    <div className={styles.console}>
                        <div className={styles.stateuploaded}>
                            <div className={styles.uploaded}>Uploaded</div>
                        </div>
                        <div className={styles.statedefault} />
                    </div>
                    <img className={styles.basilplayOutlineIcon} alt="" src="basil:play-outline.svg" />
                </div>
                <div className={styles.processingConsole}>
                    <div className={styles.console}>
                        <div className={styles.stateprocessing}>
                            <div className={styles.processing}>Processing...</div>
                        </div>
                        <div className={styles.statedefault} />
                    </div>
                </div>
                <div className={styles.recordingConsole}>
                    <div className={styles.console}>
                        <div className={styles.staterecording}>
                            <div className={styles.uploaded}>Recording...</div>
                        </div>
                        <div className={styles.statedefault2} />
                    </div>
                </div>
                <div className={styles.waveformConsole}>
                    <div className={styles.audioWaveform}>
                        <div className={styles.buildConsole} />
                    </div>
                </div>
            </div>
            <div className={styles.vectorMain}>
                <img className={styles.vectorMainChild} alt="" src="Vector 2.svg" />
                <div className={styles.console2}>
                    <div className={styles.websocketConsole}>
                        <div className={styles.websocketConsole1} />
                    </div>
                </div>
                <img className={styles.vectorMainItem} alt="" src="Vector 3.svg" />
                <img className={styles.vectorMainInner} alt="" src="Vector 4.svg" />
                <div className={styles.rectangleDiv}>
                    <div className={styles.componentChild} />
                </div>
                <div className={styles.vectorMainInner1}>
                    <div className={styles.componentChild} />
                </div>
                <div className={styles.vectorMainInner2}>
                    <div className={styles.componentInner} />
                </div>
                <div className={styles.vectorMainInner3}>
                    <div className={styles.componentChild1} />
                </div>
                <div className={styles.vectorMainInner4}>
                    <div className={styles.componentChild1} />
                </div>
                <div className={styles.vectorMainInner5}>
                    <div className={styles.componentChild3} />
                </div>
                <div className={styles.vectorMainInner6}>
                    <div className={styles.componentChild3} />
                </div>
                <div className={styles.vectorMainInner7}>
                    <div className={styles.componentChild3} />
                </div>
                <div className={styles.vectorMainInner8}>
                    <div className={styles.componentChild} />
                </div>
                <div className={styles.vectorMainInner9}>
                    <div className={styles.componentChild7} />
                </div>
                <div className={styles.vectorMainInner10}>
                    <div className={styles.componentChild3} />
                </div>
                <img className={styles.triangleIcon} alt="" src="Triangle.svg" />
                <b className={styles.websocket}>WebSocket API</b>
                <img className={styles.vectorIcon} alt="" src="Vector 37.svg" />
                <div className={styles.vectorMainChild1} />
                <img className={styles.polygonIcon} alt="" src="Polygon 16.svg" />
                <img className={styles.vectorMainChild2} alt="" src="Vector 38.svg" />
            </div>
            <div className={styles.threeBars}>
                <img className={styles.threeBarsChild} alt="" src="Frame 6.svg" />
                <img className={styles.threeBarsItem} alt="" src="Frame 5.svg" />
                <img className={styles.threeBarsInner} alt="" src="Frame 4.svg" />
                <b className={styles.b}> 1</b>
                <b className={styles.b1}>2</b>
                <b className={styles.b2}>
                    <p className={styles.p}>3</p>
                </b>
            </div>
            <img className={styles.groupIcon} alt="" src="Group 9.svg" />
            <img className={styles.waveconsoleGroupIcon} alt="" src="WaveConsole Group.svg" />
            <img className={styles.frameChild1} alt="" src="Group 10.png" />
            <div className={styles.rpVector}>
                <div className={styles.rpb}>
                    <img className={styles.rpbIcon} alt="" src="RPB.svg" />
                    <img className={styles.rpbFillIcon} alt="" src="RPB Fill.svg" />
                    <div className={styles.buildConsole1}>
                        <div className={styles.buildConsole2}>
                            <div className={styles.buildConsole3} />
                        </div>
                    </div>
                    <b className={styles.build}>GPT</b>
                </div>
                <div className={styles.rpc}>
                    <img className={styles.rpcIcon} alt="" src="RPC.svg" />
                    <img className={styles.rpcFillIcon} alt="" src="RPC Fill.svg" />
                    <div className={styles.terminalConsole}>
                        <div className={styles.buildConsole2}>
                            <div className={styles.buildConsole3} />
                        </div>
                    </div>
                    <b className={styles.ide}>IDE</b>
                </div>
                <div className={styles.rpt}>
                    <img className={styles.rptIcon} alt="" src="RPT.svg" />
                    <img className={styles.rptFillIcon} alt="" src="RPT Fill.svg" />
                    <div className={styles.serverConsole}>
                        <div className={styles.buildConsole2}>
                            <div className={styles.buildConsole3} />
                        </div>
                    </div>
                    <b className={styles.server}>HUD</b>
                </div>
                <img className={styles.rpVectorBackground} alt="" src="RP Vector Background.svg" />
                <div className={styles.rpVectorLights}>
                    <img className={styles.rpVectorLight} alt="" src="RP Vector Light.svg" />
                    <div className={styles.rpv1} />
                    <div className={styles.rpv2} />
                    <div className={styles.rpv3} />
                    <div className={styles.rpv4} />
                </div>
            </div>
            <img className={styles.grafanaConsoleGroup} alt="" src="Grafana Console Group.svg" />
            <img className={styles.chatPanelVector1} alt="" src="Chat Panel Vector 1.svg" />
            <img className={styles.chatPanelVector2} alt="" src="Chat Panel Vector 2.svg" />
            <div className={styles.chatPanelVectorParent}>
                <img className={styles.chatPanelVector} alt="" src="Chat Panel Vector.svg" />
                <div className={styles.gptAssistantStatus} />
                <div className={styles.textInput} />
                <div className={styles.gptpopupButton}>
                    <img className={styles.statepressedIcon} alt="" src="State=Pressed.svg" />
                    <img className={styles.statepressedIcon} alt="" src="State=Hover.svg" />
                    <img className={styles.statepressedIcon} alt="" src="State=Default.svg" />
                </div>
                <img className={styles.basilsendOutlineIcon} alt="" src="basil:send-outline.svg" />
                <img className={styles.basilmicrophoneOutlineIcon} alt="" src="basil:microphone-outline.svg" />
                <img className={styles.basilattachOutlineIcon} alt="" src="basil:attach-outline.svg" />
            </div>
            <div className={styles.ideButton}>
                <img className={styles.statepressedIcon} alt="" src="State=Pressed.svg" />
                <img className={styles.statepressedIcon} alt="" src="State=Hover.svg" />
                <img className={styles.statepressedIcon} alt="" src="State=Default.svg" />
            </div>
            <img className={styles.hudVectorLights} alt="" src="HUD Vector Lights.svg" />
            <div className={styles.terminalRelease}>
                <img className={styles.statepressedIcon2} alt="" src="State=Pressed.svg" />
                <img className={styles.statepressedIcon2} alt="" src="State=Hover.svg" />
                <div className={styles.statepressedIcon2}>
                    <img className={styles.statedefaultChild} alt="" src="Vector 73.svg" />
                    <img className={styles.statedefaultItem} alt="" src="Vector 74.svg" />
                    <img className={styles.statedefaultInner} alt="" src="Vector 75.svg" />
                    <img className={styles.statedefaultChild1} alt="" src="Vector 76.svg" />
                    <img className={styles.statedefaultChild2} alt="" src="Vector 77.svg" />
                    <div className={styles.engage}>
                        <p className={styles.p}>ENGAGE</p>
                    </div>
                </div>
            </div>
            
            {/* GPT Assistant Overlay */}
            {showGPT && <GPTPopup onClose={() => setShowGPT(false)} />}

            {/* Terminal Overlay */}
            {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}

            {/* Vector72 Overlay */}
            {showVector72 && <Vector72 onClose={() => setShowVector72(false)} />}

            {/* Buttons to Toggle Overlays */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button onClick={() => setShowGPT(!showGPT)} className="btn">gptpopupButton</button>
              <button onClick={() => setShowTerminal(!showTerminal)} className="btn">terminalRelease</button>
              <button onClick={() => setShowVector72(!showVector72)} className="btn">ideButton</button>
            </div>
        </div>
    );
}; 

export default VectorFrame;
