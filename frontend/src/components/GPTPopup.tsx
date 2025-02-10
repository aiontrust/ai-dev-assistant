import React, { FunctionComponent } from 'react';
import styles from './GPTPopup.module.css';


const GPTPopup:FunctionComponent = () => {
  	return (
    		<div className={styles.gptPopup}>
      			<img className={styles.gptPopupChild} alt="" src="Vector 55.svg" />
      			<div className={styles.consoleGptOutputParent}>
        				<div className={styles.consoleGptOutput} />
        				<img className={styles.scrollbarGutterIcon} alt="" src="Scrollbar-Gutter.svg" />
        				<div className={styles.scrollbar}>
          					<img className={styles.statedefaultIcon} alt="" src="State=Default.svg" />
        				</div>
      			</div>
      			<img className={styles.gptPopupItem} alt="" src="Group 36.svg" />
      			<img className={styles.gptPopupInner} alt="" src="Group 35.svg" />
    		</div>);
};

export default GPTPopup;
