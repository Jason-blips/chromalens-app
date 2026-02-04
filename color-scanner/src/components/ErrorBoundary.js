import React from 'react';
import styles from './ErrorBoundary.module.css';

/**
 * 错误边界组件
 * 捕获子组件树中的JavaScript错误，记录错误并显示降级UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // 更新state，使下一次渲染能够显示降级UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // 记录错误信息
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // 可以在这里将错误日志上报到错误监控服务
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null,
            errorInfo: null 
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.errorBoundary}>
                    <div className={styles.errorContent}>
                        <h2 className={styles.errorTitle}>⚠️ 出现了一些问题</h2>
                        <p className={styles.errorMessage}>
                            应用程序遇到了意外错误。我们已经记录了这个问题，请尝试刷新页面。
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className={styles.errorDetails}>
                                <summary>错误详情（开发模式）</summary>
                                <pre className={styles.errorStack}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        <div className={styles.errorActions}>
                            <button 
                                className={styles.resetButton}
                                onClick={this.handleReset}
                            >
                                重试
                            </button>
                            <button 
                                className={styles.reloadButton}
                                onClick={() => window.location.reload()}
                            >
                                刷新页面
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
