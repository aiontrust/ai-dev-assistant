import React, { FunctionComponent } from 'react';
import styles from './Vector72.module.css';


const VectorFrame = () => {
  	return (
    		<div className={styles.vectorParent}>
      			<img className={styles.frameChild} alt="" src="Vector 72.svg" />
      			<div className={styles.editorPanel}>
        				<img className={styles.editorPanelChild} alt="" src="Vector 23.svg" />
        				<img className={styles.button2Icon} alt="" src="Button 2.svg" />
        				<div className={styles.button1}>
          					<img className={styles.statepressedIcon} alt="" src="State=Pressed.svg" />
          					<img className={styles.statepressedIcon} alt="" src="State=Hover.svg" />
          					<img className={styles.statepressedIcon} alt="" src="State=Default.svg" />
        				</div>
        				<img className={styles.editorPanelItem} alt="" src="Group 25.svg" />
        				<img className={styles.editorPanelInner} alt="" src="Group 26.png" />
        				<img className={styles.groupIcon} alt="" src="Group 27.svg" />
        				<img className={styles.editorPanelChild1} alt="" src="Group 28.svg" />
        				<img className={styles.editorPanelChild2} alt="" src="Group 29.png" />
        				<img className={styles.lightGroup30} alt="" src="Light Group 30.svg" />
        				<img className={styles.lightGroup31} alt="" src="Light Group 31.svg" />
      			</div>
      			<img className={styles.vectorLightsMini} alt="" src="Vector Lights Mini.svg" />
      			<div className={styles.terminalConsole}>
        				<div className={styles.terminalConsoleWrapper}>
          					<div className={styles.terminalConsole1} />
        				</div>
      			</div>
      			<div className={styles.editorConsole}>
        				<div className={styles.editorConsole1} />
      			</div>
    		</div>);
};

export default VectorFrame;
