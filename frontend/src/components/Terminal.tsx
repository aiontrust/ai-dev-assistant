import React, { FunctionComponent } from 'react';
import styles from './Terminal.module.css';


const Terminal:FunctionComponent = () => {
  	return (
    		<div className={styles.terminal}>
      			<img className={styles.terminalChild} alt="" src="Vector 78.svg" />
      			<div className={styles.terminal1}>
        				<div className={styles.terminalConsoleWrapper}>
          					<div className={styles.terminalConsole} />
        				</div>
      			</div>
      			<div className={styles.terminalReleasedisengage}>
        				<img className={styles.terminalReleasedisengageChild} alt="" src="Vector 73.svg" />
        				<img className={styles.terminalReleasedisengageItem} alt="" src="Vector 74.svg" />
        				<img className={styles.terminalReleasedisengageInner} alt="" src="Vector 75.svg" />
        				<img className={styles.vectorIcon} alt="" src="Vector 76.svg" />
        				<img className={styles.terminalReleasedisengageChild1} alt="" src="Vector 77.svg" />
        				<div className={styles.disengage}>DISENGAGE</div>
      			</div>
    		</div>);
};

export default Terminal;
